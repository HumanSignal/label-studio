type RequestControls = {
  releaseRequest: () => void;
  rejectRequest: () => void;
};

/**
 * Network throttling utility for testing buffering scenarios
 */
export class Network {
  private static activeThrottles = new Map<string, () => void>();
  private static controlledDelays = new Map<string, RequestControls>();

  /**
   * Disable browser cache (equivalent to DevTools "Disable Cache" checkbox)
   */
  static disableBrowserCache(): void {
    cy.wrap(
      Cypress.automation("remote:debugger:protocol", {
        command: "Network.setCacheDisabled",
        params: {
          cacheDisabled: true,
        },
      }),
    );
  }

  /**
   * Enable browser cache back
   */
  static enableBrowserCache(): void {
    cy.wrap(
      Cypress.automation("remote:debugger:protocol", {
        command: "Network.setCacheDisabled",
        params: {
          cacheDisabled: false,
        },
      }),
    );
  }

  /**
   * Throttle network speed for specified URL pattern
   * @param urlPattern - URL pattern to throttle (can be glob pattern)
   * @param throttleKbps - Speed in Kbps (e.g., 50 for slow 3G)
   * @param alias - Unique alias for this throttle
   */
  static throttleNetwork(urlPattern: string, throttleKbps: number, alias: string): void {
    cy.intercept(
      {
        url: urlPattern,
        middleware: true,
      },
      (req) => {
        req.on("response", (res) => {
          res.setThrottle(throttleKbps);
        });
      },
    ).as(alias);

    // Store cleanup function
    Network.activeThrottles.set(alias, () => {
      // Cypress doesn't provide direct way to remove intercept,
      // so we'll override with a pass-through intercept
      cy.intercept(urlPattern, (req) => {
        req.reply();
      });
    });
  }

  /**
   * Add delay to network requests
   * @param urlPattern - URL pattern to delay
   * @param delayMs - Delay in milliseconds
   * @param alias - Unique alias for this delay
   */
  static delayNetwork(urlPattern: string, delayMs: number, alias: string): void {
    cy.intercept(
      {
        url: urlPattern,
        middleware: true,
      },
      (req) => {
        req.on("response", (res) => {
          // Wait for delay in milliseconds before sending the response to the client.
          res.setDelay(delayMs);
        });
      },
    ).as(alias);

    Network.activeThrottles.set(alias, () => {
      cy.intercept(urlPattern, (req) => {
        req.reply();
      });
    });
  }

  /**
   * Create controlled delay that can be manually released
   * @param urlPattern - URL pattern to delay
   * @param alias - Unique alias for this delay
   * @returns Object with releaseRequest and rejectRequest methods
   */
  static createControlledDelay(
    urlPattern: string,
    alias: string,
  ): {
    releaseRequest: () => void;
    rejectRequest: () => void;
  } {
    let resolveRequest: () => void;
    let rejectRequest: () => void;

    const requestPromise = new Promise<void>((resolve, reject) => {
      resolveRequest = resolve;
      rejectRequest = reject;
    });

    cy.intercept(
      {
        url: urlPattern,
        middleware: true,
      },
      (req) => {
        req.responseTimeout = 0; // Disable automatic timeout
        req.reply(async (res) => {
          try {
            await requestPromise;
            res.send();
          } catch (_error) {
            res.send({ statusCode: 500, body: "Network error simulated" });
          }
        });
      },
    ).as(alias);

    const controls: RequestControls = {
      releaseRequest: () => cy.wait(0).then(() => resolveRequest()),
      rejectRequest: () => cy.wait(0).then(() => rejectRequest()),
    };

    Network.controlledDelays.set(alias, controls);
    Network.activeThrottles.set(alias, () => {
      if (Network.controlledDelays.has(alias)) {
        Network.controlledDelays.get(alias).releaseRequest();
      }
      Network.controlledDelays.delete(alias);
      cy.intercept(urlPattern, (req) => {
        req.reply();
      });
    });

    return controls;
  }

  /**
   * Combine throttling with additional delay
   * @param urlPattern - URL pattern to throttle
   * @param throttleKbps - Speed in Kbps
   * @param delayMs - Additional delay in milliseconds
   * @param alias - Unique alias for this throttle
   */
  static throttleWithDelay(urlPattern: string, throttleKbps: number, delayMs: number, alias: string): void {
    cy.intercept(
      {
        url: urlPattern,
        middleware: true,
      },
      (req) => {
        req.reply({
          throttleKbps: throttleKbps,
          delay: delayMs,
        });
      },
    ).as(alias);

    Network.activeThrottles.set(alias, () => {
      cy.intercept(urlPattern, (req) => {
        req.reply();
      });
    });
  }

  /**
   * Clear specific throttle by alias
   * @param alias - Alias of the throttle to clear
   */
  static clearThrottle(alias: string): void {
    const cleanup = Network.activeThrottles.get(alias);
    if (cleanup) {
      cleanup();
      Network.activeThrottles.delete(alias);
    }

    const controlledDelay = Network.controlledDelays.get(alias);
    if (controlledDelay) {
      controlledDelay.releaseRequest();
      Network.controlledDelays.delete(alias);
    }
  }

  /**
   * Clear all active throttles and delays
   */
  static clearAllThrottles(): void {
    Network.activeThrottles.forEach((cleanup, _alias) => {
      cleanup();
    });
    Network.activeThrottles.clear();

    Network.controlledDelays.forEach((controls, _alias) => {
      controls.releaseRequest();
    });
    Network.controlledDelays.clear();
  }

  /**
   * Get list of active throttles
   * @returns Array of active throttle aliases
   */
  static getActiveThrottles(): string[] {
    return Array.from(Network.activeThrottles.keys());
  }

  /**
   * Check if a specific throttle is active
   * @param alias - Alias to check
   * @returns True if throttle is active
   */
  static isThrottleActive(alias: string): boolean {
    return Network.activeThrottles.has(alias);
  }
}

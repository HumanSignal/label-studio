import { cnb as cn } from "./bem";

describe("BEM utility (cn/cnb)", () => {
  describe("Basic block", () => {
    it("creates block class with toString()", () => {
      expect(cn("button").toString()).toBe("ls-button");
    });

    it("creates block class with toClassName()", () => {
      expect(cn("button").toClassName()).toBe("ls-button");
    });

    it("creates block class with implicit coercion", () => {
      expect(`${cn("button")}`).toBe("ls-button");
    });

    it("creates block class in string concatenation", () => {
      // biome-ignore lint/style/useTemplate: Testing string concatenation specifically
      expect("class: " + cn("button")).toBe("class: ls-button");
    });
  });

  describe("Element (.elem)", () => {
    it("creates element class with toString()", () => {
      expect(cn("button").elem("icon").toString()).toBe("ls-button__icon");
    });

    it("creates element class with toClassName()", () => {
      expect(cn("button").elem("icon").toClassName()).toBe("ls-button__icon");
    });

    it("creates element class with implicit coercion", () => {
      expect(`${cn("button").elem("icon")}`).toBe("ls-button__icon");
    });

    it("handles multiple elem calls (last wins)", () => {
      expect(cn("button").elem("icon").elem("text").toClassName()).toBe("ls-button__text");
    });
  });

  describe("Modifier (.mod)", () => {
    it("adds boolean true modifier with toString()", () => {
      expect(cn("button").mod({ active: true }).toString()).toBe("ls-button ls-button_active");
    });

    it("adds boolean true modifier with toClassName()", () => {
      expect(cn("button").mod({ active: true }).toClassName()).toBe("ls-button ls-button_active");
    });

    it("adds boolean true modifier with implicit coercion", () => {
      expect(`${cn("button").mod({ active: true })}`).toBe("ls-button ls-button_active");
    });

    it("ignores boolean false modifier", () => {
      expect(cn("button").mod({ active: false }).toClassName()).toBe("ls-button");
    });

    it("ignores null modifier", () => {
      expect(cn("button").mod({ active: null }).toClassName()).toBe("ls-button");
    });

    it("ignores undefined modifier", () => {
      expect(cn("button").mod({ active: undefined }).toClassName()).toBe("ls-button");
    });

    it("adds string value modifier", () => {
      expect(cn("button").mod({ size: "large" }).toClassName()).toBe("ls-button ls-button_size_large");
    });

    it("adds number value modifier", () => {
      expect(cn("button").mod({ level: 2 }).toClassName()).toBe("ls-button ls-button_level_2");
    });

    it("handles multiple modifiers", () => {
      const result = cn("button").mod({ active: true, size: "large" }).toClassName();
      expect(result).toBe("ls-button ls-button_active ls-button_size_large");
    });

    it("chains mod calls (merges modifiers)", () => {
      const result = cn("button").mod({ active: true }).mod({ size: "large" }).toClassName();
      expect(result).toBe("ls-button ls-button_active ls-button_size_large");
    });

    it("handles empty mod object", () => {
      expect(cn("button").mod({}).toClassName()).toBe("ls-button");
    });

    it("handles mod with no argument", () => {
      expect(cn("button").mod().toClassName()).toBe("ls-button");
    });
  });

  describe("Element + Modifier", () => {
    it("creates element with modifier using toString()", () => {
      expect(cn("button").elem("icon").mod({ visible: true }).toString()).toBe(
        "ls-button__icon ls-button__icon_visible",
      );
    });

    it("creates element with modifier using toClassName()", () => {
      expect(cn("button").elem("icon").mod({ visible: true }).toClassName()).toBe(
        "ls-button__icon ls-button__icon_visible",
      );
    });

    it("creates element with modifier using implicit coercion", () => {
      expect(`${cn("button").elem("icon").mod({ visible: true })}`).toBe("ls-button__icon ls-button__icon_visible");
    });

    it("creates element with string modifier", () => {
      expect(cn("button").elem("icon").mod({ size: "small" }).toClassName()).toBe(
        "ls-button__icon ls-button__icon_size_small",
      );
    });
  });

  describe("Mix (.mix)", () => {
    it("mixes string class with toString()", () => {
      expect(cn("button").mix("extra-class").toString()).toBe("ls-button ls-extra-class");
    });

    it("mixes string class with toClassName()", () => {
      expect(cn("button").mix("extra-class").toClassName()).toBe("ls-button ls-extra-class");
    });

    it("mixes string class with implicit coercion", () => {
      expect(`${cn("button").mix("extra-class")}`).toBe("ls-button ls-extra-class");
    });

    it("mixes multiple string classes", () => {
      expect(cn("button").mix("class1", "class2").toClassName()).toBe("ls-button ls-class1 ls-class2");
    });

    it("mixes CN object", () => {
      const other = cn("icon");
      expect(cn("button").mix(other).toClassName()).toBe("ls-button ls-icon");
    });

    it("mixes CN object with element", () => {
      const other = cn("icon").elem("svg");
      expect(cn("button").mix(other).toClassName()).toBe("ls-button ls-icon__svg");
    });

    it("ignores null mix", () => {
      expect(cn("button").mix(null).toClassName()).toBe("ls-button");
    });

    it("ignores undefined mix", () => {
      expect(cn("button").mix(undefined).toClassName()).toBe("ls-button");
    });

    it("ignores empty string mix", () => {
      expect(cn("button").mix("").toClassName()).toBe("ls-button");
    });

    it("ignores whitespace-only string mix", () => {
      expect(cn("button").mix("   ").toClassName()).toBe("ls-button");
    });

    it("handles mixed null/undefined/valid values", () => {
      expect(cn("button").mix(null, "valid", undefined, "also-valid").toClassName()).toBe(
        "ls-button ls-valid ls-also-valid",
      );
    });

    it("deduplicates mixed classes", () => {
      expect(cn("button").mix("extra", "extra").toClassName()).toBe("ls-button ls-extra");
    });

    it("handles classes with ls- prefix already", () => {
      expect(cn("button").mix("ls-already-prefixed").toClassName()).toBe("ls-button ls-already-prefixed");
    });

    it("handles space-separated class string", () => {
      expect(cn("button").mix("field child-field").toClassName()).toBe("ls-button ls-field ls-child-field");
    });

    it("handles space-separated class with multiple spaces", () => {
      expect(cn("button").mix("class1  class2   class3").toClassName()).toBe("ls-button ls-class1 ls-class2 ls-class3");
    });

    it("handles array passed as single argument", () => {
      expect(cn("button").mix(["class1", "class2"]).toClassName()).toBe("ls-button ls-class1 ls-class2");
    });

    it("handles array with null/undefined values", () => {
      expect(cn("button").mix(["class1", null, "class2", undefined]).toClassName()).toBe(
        "ls-button ls-class1 ls-class2",
      );
    });

    it("handles array with CN objects", () => {
      const other = cn("icon");
      expect(cn("button").mix([other, "extra"]).toClassName()).toBe("ls-button ls-icon ls-extra");
    });

    it("handles mixed arrays and strings", () => {
      expect(cn("button").mix(["arr-class"], "string-class").toClassName()).toBe(
        "ls-button ls-arr-class ls-string-class",
      );
    });

    it("handles array with space-separated strings", () => {
      expect(cn("button").mix(["class1 class2", "class3"]).toClassName()).toBe(
        "ls-button ls-class1 ls-class2 ls-class3",
      );
    });

    it("deduplicates classes from array", () => {
      expect(cn("button").mix(["extra", "extra"]).toClassName()).toBe("ls-button ls-extra");
    });

    it("deduplicates classes across array and string args", () => {
      expect(cn("button").mix(["class1"], "class1").toClassName()).toBe("ls-button ls-class1");
    });
  });

  describe("Chaining combinations", () => {
    it("elem + mod + mix with toString()", () => {
      const result = cn("button").elem("icon").mod({ active: true }).mix("extra").toString();
      expect(result).toBe("ls-button__icon ls-button__icon_active ls-extra");
    });

    it("elem + mod + mix with toClassName()", () => {
      const result = cn("button").elem("icon").mod({ active: true }).mix("extra").toClassName();
      expect(result).toBe("ls-button__icon ls-button__icon_active ls-extra");
    });

    it("elem + mod + mix with implicit coercion", () => {
      const result = `${cn("button").elem("icon").mod({ active: true }).mix("extra")}`;
      expect(result).toBe("ls-button__icon ls-button__icon_active ls-extra");
    });

    it("complex chain", () => {
      const result = cn("menu")
        .elem("item")
        .mod({ selected: true, disabled: false, size: "large" })
        .mix("custom-class", cn("highlight"))
        .toClassName();
      expect(result).toBe("ls-menu__item ls-menu__item_selected ls-menu__item_size_large ls-custom-class ls-highlight");
    });
  });

  describe("closest()", () => {
    it("finds closest ancestor matching BEM class", () => {
      // Create test DOM structure
      const container = document.createElement("div");
      container.innerHTML = `
        <div class="ls-menu">
          <div class="ls-menu__item">
            <span class="ls-menu__icon">icon</span>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      const icon = container.querySelector(".ls-menu__icon")!;
      const menuItem = cn("menu").elem("item").closest(icon);

      expect(menuItem).not.toBeNull();
      expect(menuItem?.classList.contains("ls-menu__item")).toBe(true);

      // Cleanup
      document.body.removeChild(container);
    });

    it("returns null when no ancestor matches", () => {
      const container = document.createElement("div");
      container.innerHTML = `<div class="other-class"><span id="target">text</span></div>`;
      document.body.appendChild(container);

      const target = container.querySelector("#target")!;
      const result = cn("menu").elem("item").closest(target);

      expect(result).toBeNull();

      document.body.removeChild(container);
    });

    it("returns element itself if it matches", () => {
      const container = document.createElement("div");
      container.innerHTML = `<div class="ls-button" id="target">button</div>`;
      document.body.appendChild(container);

      const target = container.querySelector("#target")!;
      const result = cn("button").closest(target);

      expect(result).toBe(target);

      document.body.removeChild(container);
    });
  });

  describe("select()", () => {
    it("returns null when no element in document has the class", () => {
      const result = cn("no-such-block-name-xyz").select();
      expect(result).toBeNull();
    });

    it("returns first element matching BEM class", () => {
      const container = document.createElement("div");
      container.className = cn("holder").toClassName();
      container.id = "select-test-holder";
      document.body.appendChild(container);

      const found = cn("holder").select();
      expect(found).not.toBeNull();
      expect(found?.id).toBe("select-test-holder");

      document.body.removeChild(container);
    });

    it("uses same selector as closest (space-separated classes become .class1.class2)", () => {
      const container = document.createElement("div");
      container.className = cn("foo").mix("bar").toClassName();
      container.id = "select-mix-test";
      document.body.appendChild(container);

      const found = cn("foo").mix("bar").select();
      expect(found).not.toBeNull();
      expect(found?.id).toBe("select-mix-test");

      document.body.removeChild(container);
    });
  });

  describe("Edge cases", () => {
    it("handles hyphenated block names", () => {
      expect(cn("my-component").toClassName()).toBe("ls-my-component");
    });

    it("handles hyphenated element names", () => {
      expect(cn("button").elem("left-icon").toClassName()).toBe("ls-button__left-icon");
    });

    it("handles hyphenated modifier keys", () => {
      expect(cn("button").mod({ "is-active": true }).toClassName()).toBe("ls-button ls-button_is-active");
    });

    it("handles special characters in values", () => {
      expect(cn("button").mod({ type: "primary-large" }).toClassName()).toBe("ls-button ls-button_type_primary-large");
    });

    it("multiple toClassName calls return same result", () => {
      const button = cn("button").mod({ active: true });
      const first = button.toClassName();
      const second = button.toClassName();
      expect(first).toBe(second);
    });

    it("multiple toString calls return same result", () => {
      const button = cn("button").mod({ active: true });
      const first = button.toString();
      const second = button.toString();
      expect(first).toBe(second);
    });
  });

  describe("Type exports", () => {
    it("CN type is usable", () => {
      const button: ReturnType<typeof cn> = cn("button");
      expect(button.toClassName()).toBe("ls-button");
    });
  });

  describe("Real-world usage patterns", () => {
    it("className prop pattern", () => {
      const className = cn("modal").elem("content").mod({ visible: true }).toClassName();
      expect(className).toBe("ls-modal__content ls-modal__content_visible");
    });

    it("conditional modifier pattern", () => {
      const isActive = true;
      const isDisabled = false;
      const className = cn("button").mod({ active: isActive, disabled: isDisabled }).toClassName();
      expect(className).toBe("ls-button ls-button_active");
    });

    it("template literal pattern", () => {
      const className = `wrapper ${cn("button").elem("icon")}`;
      expect(className).toBe("wrapper ls-button__icon");
    });

    it("module-level constant pattern", () => {
      const buttonCn = cn("button");
      expect(buttonCn.toClassName()).toBe("ls-button");
      expect(buttonCn.elem("icon").toClassName()).toBe("ls-button__icon");
      expect(buttonCn.mod({ active: true }).toClassName()).toBe("ls-button ls-button_active");
    });
  });
});

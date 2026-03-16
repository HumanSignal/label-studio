import { observer, Provider } from "mobx-react";
import React from "react";
import clsx from "clsx";
import { SDKProvider } from "../../providers/SDKProvider";
import { cn } from "../../utils/bem";
import { Spinner } from "../Common/Spinner";
import { DataManager } from "../DataManager/DataManager";
import { Labeling } from "../Label/Label";
import "./App.prefix.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@humansignal/core/lib/utils/query-client";
import { AuthProvider } from "@humansignal/core/providers/AuthProvider";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  componentDidCatch(error: Error): void {
    this.setState({ error });
  }

  render(): React.ReactNode {
    return this.state.error ? <div className="error">{this.state.error.toString()}</div> : this.props.children;
  }
}

interface AppComponentProps {
  app: {
    SDK: {
      mode: string;
    };
    crashed: boolean;
    loading: boolean;
    isLabeling: boolean;
  };
}

/**
 * Main Component
 */
const AppComponent: React.FC<AppComponentProps> = ({ app }) => {
  const rootCN = cn("root");
  const rootClassName = rootCN.mod({ mode: app.SDK.mode }).toClassName();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Provider store={app}>
            <SDKProvider sdk={app.SDK}>
              <div className={rootClassName}>
                {app.crashed ? (
                  <div className={clsx(rootCN.toClassName(), rootClassName)}>
                    <span className={rootCN.elem("header").toClassName()}>Oops...</span>
                    <span className={rootCN.elem("description").toClassName()}>
                      Project has been deleted or not yet created.
                    </span>
                  </div>
                ) : app.loading ? (
                  <div className={cn("app-loader").toClassName()}>
                    <Spinner size="large" />
                  </div>
                ) : app.isLabeling ? (
                  <Labeling />
                ) : (
                  <DataManager />
                )}
                <div className={cn("offscreen").toClassName()} />
              </div>
            </SDKProvider>
          </Provider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export const App = observer(AppComponent);

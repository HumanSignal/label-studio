import type React from "react";
import { useContext, useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import { TourContext, TourProvider, type TourAction } from "./TourProvider";

type TourDispatch = React.Dispatch<TourAction>;

const makeTourResponse = () => ({
  $meta: { status: 200 },
  awaiting: false,
  state: "ready",
  steps: [
    {
      target: "body",
      content: "Step",
      title: "Title",
    },
  ],
});

describe("TourProvider", () => {
  it("queues second tour until active one closes", async () => {
    const callApi = mock((apiName: string, params: Record<string, any>) => {
      if (apiName === "getProductTour") {
        const name = params?.params?.name;
        return Promise.resolve({ ...makeTourResponse(), name });
      }
      return Promise.resolve({ $meta: { status: 200 } });
    });

    const dispatchA = mock() as unknown as TourDispatch;
    const dispatchB = mock() as unknown as TourDispatch;
    let ctx: React.ContextType<typeof TourContext> = null;

    const Harness = () => {
      const context = useContext(TourContext);

      useEffect(() => {
        if (!context) return;
        ctx = context;
        context.registerTour("tour-a", dispatchA);
        context.registerTour("tour-b", dispatchB);
        return () => {
          context.unregisterTour("tour-a");
          context.unregisterTour("tour-b");
        };
      }, [context]);

      return null;
    };

    render(
      <TourProvider useAPI={() => ({ callApi })}>
        <Harness />
      </TourProvider>,
    );

    await waitFor(() => expect(ctx).not.toBeNull());

    const provider = ctx!;
    await Promise.all([provider.startTour("tour-a"), provider.startTour("tour-b")]);

    expect(callApi).toHaveBeenCalledTimes(1);
    expect(callApi).toHaveBeenLastCalledWith("getProductTour", { params: { name: "tour-a" } });
    expect(dispatchA).toHaveBeenCalledTimes(1);
    expect(dispatchB).toHaveBeenCalledTimes(0);

    await provider.onTourClosed("tour-a");

    await waitFor(() => {
      expect(callApi).toHaveBeenCalledTimes(2);
      expect(callApi).toHaveBeenLastCalledWith("getProductTour", { params: { name: "tour-b" } });
      expect(dispatchB).toHaveBeenCalledTimes(1);
    });
  });
});

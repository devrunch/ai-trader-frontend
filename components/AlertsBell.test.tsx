// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AlertsBell } from "./AlertsBell";
import type { ApiAlert } from "@/lib/api";

/** The app's one real socket.io connection is a module singleton
 *  (getSocket in lib/use-live-quote.ts) that opens a real network
 *  connection when called -- mocked here the same way a component test
 *  would mock any other shared dependency, with a fake event emitter. */
function fakeSocket() {
  const handlers: Record<string, ((payload: unknown) => void)[]> = {};
  return {
    on: vi.fn((event: string, cb: (payload: unknown) => void) => {
      (handlers[event] ??= []).push(cb);
    }),
    off: vi.fn((event: string, cb: (payload: unknown) => void) => {
      handlers[event] = (handlers[event] ?? []).filter((h) => h !== cb);
    }),
    emit(event: string, payload?: unknown) {
      for (const h of handlers[event] ?? []) h(payload);
    },
  };
}

const socket = fakeSocket();

vi.mock("@/lib/use-live-quote", () => ({ getSocket: () => socket }));

const getAlerts = vi.fn();
vi.mock("@/lib/api", () => ({ getAlerts: (...args: unknown[]) => getAlerts(...args) }));

function alert(over: Partial<ApiAlert> = {}): ApiAlert {
  return {
    _id: "a1", type: "drift", title: "Gold +1.20% in the last hour",
    body: "Gold +1.20% (Risk-off gauge)", symbols: ["GC=F"],
    data: {}, createdAt: new Date().toISOString(), ...over,
  };
}

beforeEach(() => {
  getAlerts.mockReset().mockResolvedValue([]);
});

describe("AlertsBell", () => {
  it("shows no badge when there are no alerts yet", async () => {
    render(<AlertsBell />);
    await waitFor(() => expect(getAlerts).toHaveBeenCalled());
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  it("opens the panel and lists alerts fetched on mount", async () => {
    getAlerts.mockResolvedValue([alert()]);
    render(<AlertsBell />);
    await waitFor(() => expect(getAlerts).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Alerts" }));
    expect(await screen.findByText("Gold +1.20% in the last hour")).toBeInTheDocument();
  });

  it("a live alert pushed over the socket increments the unseen badge and prepends the list", async () => {
    render(<AlertsBell />);
    await waitFor(() => expect(getAlerts).toHaveBeenCalled());

    socket.emit("alert", alert({ _id: "a2", title: "Live-pushed alert" }));

    expect(await screen.findByLabelText("Alerts, 1 new")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Alerts, 1 new"));
    expect(await screen.findByText("Live-pushed alert")).toBeInTheDocument();
  });

  it("opening the panel clears the unseen count", async () => {
    render(<AlertsBell />);
    await waitFor(() => expect(getAlerts).toHaveBeenCalled());
    socket.emit("alert", alert());

    const bell = await screen.findByLabelText("Alerts, 1 new");
    fireEvent.click(bell);

    expect(screen.getByRole("button", { name: "Alerts" })).toBeInTheDocument();
  });

  it("unsubscribes from the socket on unmount", async () => {
    const { unmount } = render(<AlertsBell />);
    await waitFor(() => expect(getAlerts).toHaveBeenCalled());
    unmount();
    expect(socket.off).toHaveBeenCalledWith("alert", expect.any(Function));
  });
});

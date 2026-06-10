import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the scaffolded QR code tool placeholder", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "QR코드" })).toBeInTheDocument();
    expect(screen.getByText("Tauri scaffold 준비 완료")).toBeInTheDocument();
  });
});

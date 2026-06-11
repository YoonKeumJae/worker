import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { maxQrCodeUrlByteLength } from "../tools/qr-code/qrCodeValidation";
import { App } from "./App";

describe("App", () => {
  it("renders the QR code tool", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "QR코드" })).toBeInTheDocument();
    expect(screen.getByLabelText("URL")).toBeInTheDocument();
    expect(screen.getByText("URL 입력 후 QR코드 표시")).toBeInTheDocument();
  });

  it("shows a validation error for unsupported URL input", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("URL"), "not-a-url");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "유효한 URL을 입력하세요.",
    );
    expect(screen.getByLabelText("URL")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a validation error after an empty URL input is visited", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByLabelText("URL"));
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent("URL을 입력하세요.");
    expect(screen.getByLabelText("URL")).toHaveAttribute("aria-invalid", "true");
  });

  it("renders a QR preview for a valid URL", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("URL"), "https://example.com/path");

    expect(
      screen.getByRole("img", { name: "입력한 URL의 QR코드 미리보기" }),
    ).toBeInTheDocument();
    expect(screen.getByText("생성됨")).toBeInTheDocument();
  });

  it("shows a validation error instead of rendering an oversized QR payload", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("URL"), {
      target: {
        value: `https://example.com/${"a".repeat(maxQrCodeUrlByteLength)}`,
      },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "QR코드로 만들 URL이 너무 깁니다.",
    );
    expect(
      screen.queryByRole("img", { name: "입력한 URL의 QR코드 미리보기" }),
    ).not.toBeInTheDocument();
  });
});

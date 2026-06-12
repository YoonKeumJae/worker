import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveQrCodePng } from "../tools/qr-code/qrCodePng";
import { saveQrCodeSvg } from "../tools/qr-code/qrCodeSvg";
import { maxQrCodeUrlByteLength } from "../tools/qr-code/qrCodeValidation";
import { App } from "./App";

vi.mock("../tools/qr-code/qrCodePng", () => ({
  saveQrCodePng: vi.fn(),
}));

vi.mock("../tools/qr-code/qrCodeSvg", () => ({
  saveQrCodeSvg: vi.fn(),
}));

describe("App", () => {
  beforeEach(() => {
    vi.mocked(saveQrCodePng).mockReset();
    vi.mocked(saveQrCodeSvg).mockReset();
  });

  it("renders the QR code tool", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "QR코드" })).toBeInTheDocument();
    expect(screen.getByLabelText("URL")).toBeInTheDocument();
    expect(screen.getByText("URL 입력 후 QR코드 표시")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PNG 저장" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "SVG 저장" })).toBeDisabled();
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
    expect(screen.getByRole("button", { name: "PNG 저장" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "SVG 저장" })).toBeEnabled();
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

  it("shows a success status after saving PNG", async () => {
    const user = userEvent.setup();
    vi.mocked(saveQrCodePng).mockResolvedValue({ status: "saved" });
    render(<App />);

    await user.type(screen.getByLabelText("URL"), "https://example.com/path");
    await user.click(screen.getByRole("button", { name: "PNG 저장" }));

    expect(await screen.findByRole("status")).toHaveTextContent("PNG 저장 완료.");
  });

  it("shows a cancelled status when PNG save dialog is cancelled", async () => {
    const user = userEvent.setup();
    vi.mocked(saveQrCodePng).mockResolvedValue({ status: "cancelled" });
    render(<App />);

    await user.type(screen.getByLabelText("URL"), "https://example.com/path");
    await user.click(screen.getByRole("button", { name: "PNG 저장" }));

    expect(await screen.findByRole("status")).toHaveTextContent("PNG 저장 취소.");
  });

  it("shows a failure status when PNG save fails", async () => {
    const user = userEvent.setup();
    vi.mocked(saveQrCodePng).mockRejectedValue(new Error("write failed"));
    render(<App />);

    await user.type(screen.getByLabelText("URL"), "https://example.com/path");
    await user.click(screen.getByRole("button", { name: "PNG 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "PNG 저장 실패. 다시 시도하세요.",
    );
  });

  it("clears PNG save status when URL input changes", async () => {
    const user = userEvent.setup();
    vi.mocked(saveQrCodePng).mockResolvedValue({ status: "saved" });
    render(<App />);

    await user.type(screen.getByLabelText("URL"), "https://example.com/path");
    await user.click(screen.getByRole("button", { name: "PNG 저장" }));
    expect(await screen.findByRole("status")).toHaveTextContent("PNG 저장 완료.");

    await user.type(screen.getByLabelText("URL"), "?next=1");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a success status after saving SVG", async () => {
    const user = userEvent.setup();
    vi.mocked(saveQrCodeSvg).mockResolvedValue({ status: "saved" });
    render(<App />);

    await user.type(screen.getByLabelText("URL"), "https://example.com/path");
    await user.click(screen.getByRole("button", { name: "SVG 저장" }));

    expect(await screen.findByRole("status")).toHaveTextContent("SVG 저장 완료.");
  });

  it("shows a cancelled status when SVG save dialog is cancelled", async () => {
    const user = userEvent.setup();
    vi.mocked(saveQrCodeSvg).mockResolvedValue({ status: "cancelled" });
    render(<App />);

    await user.type(screen.getByLabelText("URL"), "https://example.com/path");
    await user.click(screen.getByRole("button", { name: "SVG 저장" }));

    expect(await screen.findByRole("status")).toHaveTextContent("SVG 저장 취소.");
  });

  it("shows a failure status when SVG save fails", async () => {
    const user = userEvent.setup();
    vi.mocked(saveQrCodeSvg).mockRejectedValue(new Error("write failed"));
    render(<App />);

    await user.type(screen.getByLabelText("URL"), "https://example.com/path");
    await user.click(screen.getByRole("button", { name: "SVG 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "SVG 저장 실패. 다시 시도하세요.",
    );
  });

  it("clears SVG save status when URL input changes", async () => {
    const user = userEvent.setup();
    vi.mocked(saveQrCodeSvg).mockResolvedValue({ status: "saved" });
    render(<App />);

    await user.type(screen.getByLabelText("URL"), "https://example.com/path");
    await user.click(screen.getByRole("button", { name: "SVG 저장" }));
    expect(await screen.findByRole("status")).toHaveTextContent("SVG 저장 완료.");

    await user.type(screen.getByLabelText("URL"), "?next=1");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  convertImageFormats,
  selectImageFiles,
} from "./imageFormatConversion";
import { ImageFormatConverterTool } from "./ImageFormatConverterTool";

vi.mock("./imageFormatConversion", async () => {
  const actual = await vi.importActual<typeof import("./imageFormatConversion")>(
    "./imageFormatConversion",
  );

  return {
    ...actual,
    convertImageFormats: vi.fn(),
    selectImageFiles: vi.fn(),
  };
});

describe("ImageFormatConverterTool", () => {
  beforeEach(() => {
    vi.mocked(convertImageFormats).mockReset();
    vi.mocked(selectImageFiles).mockReset();
  });

  it("requires replacement confirmation before converting selected images", async () => {
    const user = userEvent.setup();
    vi.mocked(selectImageFiles).mockResolvedValue(["/tmp/photo.png"]);
    vi.mocked(convertImageFormats).mockResolvedValue([
      { originalPath: "/tmp/photo.png", outputPath: "/tmp/photo.jpg" },
    ]);
    render(<ImageFormatConverterTool />);

    await user.click(screen.getByRole("button", { name: "이미지 선택" }));

    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "변환" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "JPG" }));
    await user.click(screen.getByLabelText("원본 파일 교체 확인"));
    await user.click(screen.getByRole("button", { name: "변환" }));

    expect(convertImageFormats).toHaveBeenCalledWith(["/tmp/photo.png"], "jpeg");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "1개 이미지 변환 완료.",
    );
    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "변환" })).toBeDisabled();
    expect(screen.getByLabelText("원본 파일 교체 확인")).not.toBeChecked();
  });

  it("shows the backend conversion error message", async () => {
    const user = userEvent.setup();
    vi.mocked(selectImageFiles).mockResolvedValue(["/tmp/photo.jpeg"]);
    vi.mocked(convertImageFormats).mockRejectedValue(
      "이미 같은 이름의 파일이 있습니다: /tmp/photo.png",
    );
    render(<ImageFormatConverterTool />);

    await user.click(screen.getByRole("button", { name: "이미지 선택" }));
    await user.click(screen.getByLabelText("원본 파일 교체 확인"));
    await user.click(screen.getByRole("button", { name: "변환" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이미 같은 이름의 파일이 있습니다: /tmp/photo.png",
    );
  });
});

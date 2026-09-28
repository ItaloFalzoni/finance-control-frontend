"use client";

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import WelcomeScreen from "@/components/WelcomeScreen";

afterEach(() => cleanup());

describe("WelcomeScreen", () => {
  it("mostra somente o botão Começar", () => {
    render(<WelcomeScreen pending={false} error={null} onStart={() => {}} />);

    const button = screen.getByRole("button", { name: "Começar" });
    expect(button.textContent).toBe("Começar");
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("loading desabilita e troca o texto", () => {
    render(<WelcomeScreen pending={true} error={null} onStart={() => {}} />);

    const button = screen.getByRole("button", { name: "Criando conta…" });
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("erro mostra alerta e mantém o botão para retry", () => {
    const onStart = vi.fn();
    render(
      <WelcomeScreen pending={false} error="Falhou" onStart={onStart} />,
    );

    expect(screen.getByRole("alert").textContent).toBe("Falhou");
    const button = screen.getByRole("button", { name: "Começar" });
    fireEvent.click(button);
    expect(onStart).toHaveBeenCalledOnce();
  });
});

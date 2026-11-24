export type TaskAccent = {
  surface: string;
  border: string;
  accent: string;
};

export type AppTheme = {
  name: string;
  mode: "light" | "dark";
  colors: {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    placeholder: string;
    border: string;
    primary: string;
    primarySoft: string;
    primaryText: string;
    danger: string;
    disabled: string;
    strikethrough: string;
  };
  taskAccents: readonly TaskAccent[];
};

export const pastelRainbowTheme: AppTheme = {
  name: "Pastel Rainbow",
  mode: "light",
  colors: {
    background: "#FFFBF7",
    surface: "#FFFFFF",
    text: "#352D40",
    mutedText: "#7D7288",
    placeholder: "#9B91A5",
    border: "#EEE7EF",
    primary: "#6F8FF5",
    primarySoft: "#EEF2FF",
    primaryText: "#FFFFFF",
    danger: "#E97991",
    disabled: "#C9C4D0",
    strikethrough: "#84798E",
  },
  taskAccents: [
    { surface: "#FFF0F5", border: "#F5CADB", accent: "#E88CAD" },
    { surface: "#FFF3EA", border: "#F1D3BB", accent: "#E9A477" },
    { surface: "#FFFAE8", border: "#F0E4AD", accent: "#D6B94F" },
    { surface: "#EFFAF3", border: "#C9E8D3", accent: "#72B68D" },
    { surface: "#EEF7FF", border: "#C8DFF4", accent: "#78AEE3" },
  ],
};

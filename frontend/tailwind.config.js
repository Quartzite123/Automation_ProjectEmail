/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F7F7",
        primary: "#FF385C",
        secondary: "#222222",
        card: "#FFFFFF",
        border: "#E5E7EB",
        textPrimary: "#222222",
        textSecondary: "#6B7280",
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}

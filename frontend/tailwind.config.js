// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Этот путь должен покрывать все ваши компоненты React
  ],
  theme: {
    extend: {},
  },
  plugins: [], // Убедитесь, что здесь нет ничего лишнего, если вы не используете дополнительные плагины Tailwind
};

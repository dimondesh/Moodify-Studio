// postcss.config.cjs
module.exports = {
  plugins: [
    require("@tailwindcss/postcss"), // Используем новый пакет
    require("autoprefixer"),
  ],
};

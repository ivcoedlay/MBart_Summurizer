/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Базовая палитра
        'bg-main': '#C3DCF0', // Soft Blue (фон страницы)
        'brand-primary': '#91B9C1', // Sage/Teal (основной акцент, кнопки)
        'ui-neutral': '#D8DDE1', // Light Gray (границы, нейтральный фон)
        'cta-highlight': '#C19569', // Earthy Tan (акцентные действия, предупреждения)
        'text-dark': '#090401', // Deep Black (текст, заголовки)

        // Семантические цвета для обратной связи
        'status-queued': '#91B9C1',
        'status-running': '#C19569',
        'status-done': '#4CAF50', // Приглушенный зеленый для успеха
        'status-failed': '#E53935', // Красный для ошибки
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Рекомендуется современный минималистичный шрифт
      },
      boxShadow: {
        // Легкая тень для "подвижности" элементов
        'minimal': '0 1px 3px rgba(9, 4, 1, 0.08)',
        'elevated': '0 4px 6px rgba(9, 4, 1, 0.12)',
      }
    },
  },
  plugins: [],
}
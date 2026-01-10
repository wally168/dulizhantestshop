const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-preset-env": {
      stage: 3,
      features: {
        "nesting-rules": true,
        "custom-properties": false, // Tailwind handles variables
      },
    },
  },
};

export default config;

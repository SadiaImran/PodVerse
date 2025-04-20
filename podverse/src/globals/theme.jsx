function theme() {
  return {
    colors: {
      black: '#1C1C1C',
      grey: '#6A6A6A',
      charcoal: '#3E3F5B',
      cream: '#F9F5EB',
      deepPurple: '#2F2867',
      purple: '#6057C7',
      lavender: '#A388E7',
      softBlue: '#ACBFEC',
      skyBlue: '#6280E4',
      deepBlue: '#0F3995',
      lightPurple: "#7d6ce3",

      // UI Mapping
      background: '#F9F5EB',
      text: '#1C1C1C',
      primary: '#6057C7',     // purple
      secondary: '#6280E4',   // sky blue
      accent: '#A388E7',
      button: {
        base: '#6057C7',
        hover: '#2F2867',
        text: '#F9F5EB',
      },
    },

    font: {
      heading: `'Poppins', sans-serif`,
      body: `'Inter', sans-serif`,
      code: `'Fira Code', monospace`,
    },
  };
}

export default theme;

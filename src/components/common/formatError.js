// src/components/common/formatError.js

export const capitalizeFirst = (str) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
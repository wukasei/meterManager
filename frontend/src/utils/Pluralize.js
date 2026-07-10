export const pluralize = (count, singular, pluralFew, pluralMany) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return pluralMany;
  }
  if (lastDigit === 1) {
    return singular;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return pluralFew;
  }
  return pluralMany;
};

/**
 * Converts the first character of the input string to lowercase.
 *
 * This function takes a string and returns a new string with its first character converted
 * to lowercase while leaving the rest of the string unchanged. If the input string is empty,
 * it returns the empty string.
 *
 * @param input - The string to be uncapitalized.
 * @returns The input string with the first character in lowercase.
 *
 * @example
 * // Returns "hello"
 * uncapitalize("Hello");
 *
 * @template T - A string literal type.
 */
export const uncapitalize = <T extends string>(input: T) =>
  (input.length
    ? `${input[0]!.toLocaleLowerCase()}${
      input.length > 1 ? input.slice(1, input.length) : ""
    }`
    : input) as Uncapitalize<T>;

/**
 * Converts the first character of the input string to uppercase.
 *
 * This function takes a string and returns a new string with its first character converted
 * to uppercase while leaving the rest of the string unchanged. If the input string is empty,
 * it returns the empty string.
 *
 * @param input - The string to be capitalized.
 * @returns The input string with the first character in uppercase.
 *
 * @example
 * // Returns "Hello"
 * capitalize("hello");
 *
 * @template T - A string literal type.
 */
export const capitalize = <T extends string>(input: T) =>
  (input.length
    ? `${input[0]!.toLocaleUpperCase()}${
      input.length > 1 ? input.slice(1, input.length) : ""
    }`
    : input) as Capitalize<T>;

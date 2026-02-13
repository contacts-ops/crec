export const toPascalCase = (str: string) => {
    // Remplacer tous les tirets et underscores par des espaces
    let result = str.replace(/[-_]+/g, ' ');
    // Mettre en majuscule la première lettre de chaque mot
    result = result.replace(/(?:^|\s)(\w)/g, (match, letter) => letter.toUpperCase());
    // Retirer tous les espaces
    result = result.replace(/\s+/g, '');
    return result;
};
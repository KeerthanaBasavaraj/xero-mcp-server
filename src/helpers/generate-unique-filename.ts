import path from "path";

/**
 * Generates a unique filename by checking if it already exists in the list of existing filenames
 * If a duplicate is found, it adds an incremental number in parentheses before the extension
 * Example: car.png -> car (1).png -> car (2).png
 */
export function generateUniqueFilename(
  originalFileName: string,
  existingFileNames: string[]
): string {
  const { name, ext } = path.parse(originalFileName);
  const baseName = name;
  
  // Check if the original filename already exists
  if (!existingFileNames.includes(originalFileName)) {
    return originalFileName;
  }
  
  // Find the next available number
  let counter = 1;
  let newFileName: string;
  
  do {
    newFileName = `${baseName} (${counter})${ext}`;
    counter++;
  } while (existingFileNames.includes(newFileName));
  
  return newFileName;
}

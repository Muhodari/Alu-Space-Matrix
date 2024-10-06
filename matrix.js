const fs = require('fs');
const readline = require('readline'); // Import the readline module

function createSparseMatrix(numRows, numCols) {
    return {
        rows: numRows,
        cols: numCols,
        elements: {}
    };
}

function loadMatrixFromFile(matrixFilePath) {
    try {
        const fileContent = fs.readFileSync(matrixFilePath, "utf-8");
        const lines = fileContent.split('\n');

        if (lines.length < 2) {
            throw new Error(
                `File ${matrixFilePath} does not contain enough lines for matrix dimensions`
            );
        }

        // Parse dimensions
        const rowMatch = /^rows=(\d+)/.exec(lines[0].trim()); // Use regex
        const colMatch = /^cols=(\d+)/.exec(lines[1].trim()); // Use regex

        if (!rowMatch || !colMatch) {
            throw new Error(
                `Invalid dimension format in file ${matrixFilePath}. Expected 'rows=X' and 'cols=Y'`
            );
        }

        const totalRows = parseInt(rowMatch[1]);
        const totalCols = parseInt(colMatch[1]);

        const sparseMatrix = createSparseMatrix(totalRows, totalCols);

        // Parse elements
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === "") continue; // Skip empty lines

            const match = /^\((\d+),\s*(\d+),\s*(-?\d+)\)/.exec(line);
            if (!match) {
                throw new Error(
                    `Invalid format at line ${i + 1} in file ${matrixFilePath}: ${line}`
                );
            }

            const row = parseInt(match[1]);
            const col = parseInt(match[2]);
            const value = parseInt(match[3]);

            setMatrixElement(sparseMatrix, row, col, value);
        }

        return sparseMatrix;
    } catch (error) {
        throw error.code === 'ENOENT' ? new Error(`File not found: ${matrixFilePath}`) : error;
    }
}

function getMatrixElement(matrix, row, col) {
    const key = `${row},${col}`;
    return key in matrix.elements ? matrix.elements[key] : 0;
}

function setMatrixElement(matrix, row, col, value) {
    if (row >= matrix.rows) {
        matrix.rows = row + 1;
    }
    if (col >= matrix.cols) {
        matrix.cols = col + 1;
    }

    const key = `${row},${col}`;
    matrix.elements[key] = value;
}

function addMatrices(matrix1, matrix2) {
    if (matrix1.rows !== matrix2.rows || matrix1.cols !== matrix2.cols) {
        throw new Error("Matrices must have the same dimensions for addition.");
    }

    const result = createSparseMatrix(matrix1.rows, matrix1.cols);

    for (const key in matrix1.elements) {
        const value = matrix1.elements[key];
        const [row, col] = key.split(',').map(Number);
        setMatrixElement(result, row, col, value);
    }

    for (const key in matrix2.elements) {
        const value = matrix2.elements[key];
        const [row, col] = key.split(',').map(Number);
        const currentValue = getMatrixElement(result, row, col);
        setMatrixElement(result, row, col, currentValue + value);
    }

    return result;
}

function subtractMatrices(matrix1, matrix2) {
    if (matrix1.rows !== matrix2.rows || matrix1.cols !== matrix2.cols) {
        throw new Error("Matrices must have the same dimensions for subtraction.");
    }

    const result = createSparseMatrix(matrix1.rows, matrix1.cols);

    for (const key in matrix1.elements) {
        const value = matrix1.elements[key];
        const [row, col] = key.split(',').map(Number);
        setMatrixElement(result, row, col, value);
    }

    for (const key in matrix2.elements) {
        const value = matrix2.elements[key];
        const [row, col] = key.split(',').map(Number);
        const currentValue = getMatrixElement(result, row, col);
        setMatrixElement(result, row, col, currentValue - value);
    }

    return result;
}

function multiplyMatrices(matrix1, matrix2) {
    if (matrix1.cols !== matrix2.rows) {
        throw new Error("Number of columns of first matrix must equal number of rows of second matrix.");
    }

    const result = createSparseMatrix(matrix1.rows, matrix2.cols);

    for (const key in matrix1.elements) {
        const value = matrix1.elements[key];
        const [row, col] = key.split(',').map(Number);
        for (let k = 0; k < matrix2.cols; k++) {
            const otherValue = getMatrixElement(matrix2, col, k);
            if (otherValue !== 0) {
                const currentValue = getMatrixElement(result, row, k);
                setMatrixElement(result, row, k, currentValue + value * otherValue);
            }
        }
    }

    return result;
}

function matrixToString(matrix) {
    let result = `rows=${matrix.rows}\ncols=${matrix.cols}\n`;
    for (const key in matrix.elements) {
        const value = matrix.elements[key];
        result += `(${key.split(',')[0]}, ${key.split(',')[1]}, ${value})\n`;
    }
    return result.trim();
}

function saveMatrixToFile(matrix, filePath) {
    const content = matrixToString(matrix);
    fs.writeFileSync(filePath, content);
}

function performMatrixOperations() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const askQuestion = (query) => {
        return new Promise((resolve) => {
            rl.question(query, resolve);
        });
    };

    (async () => {
        try {
            const matrixOperations = {
                'a': { name: "addition", method: addMatrices },
                'b': { name: "subtraction", method: subtractMatrices },
                'c': { name: "multiplication", method: multiplyMatrices },
            };

            console.log("Menu :");
            for (const key in matrixOperations) {
                const operation = matrixOperations[key];
                console.log(`${key}: ${operation.name}`);
            }

            const matrixFilePath1 = await askQuestion("Enter the file path for the first matrix: ");
            const matrix1 = loadMatrixFromFile(matrixFilePath1);

            const matrixFilePath2 = await askQuestion("Enter the file path for the second matrix: ");
            const matrix2 = loadMatrixFromFile(matrixFilePath2);

            const operationChoice = await askQuestion("Choose an option (a, b, or c): ");
            const operation = matrixOperations[operationChoice];

            if (!operation) {
                throw new Error("Invalid option.");
            }

            const resultMatrix = operation.method(matrix1, matrix2);
            console.log(`Output of ${operation.name}........\n`);

            const outputFilePath = await askQuestion("Enter the file path to save the result: ");
            saveMatrixToFile(resultMatrix, outputFilePath);
        } catch (error) {
            console.log("Error:", error.message);
        } finally {
            rl.close();
        }
    })();
}

performMatrixOperations();

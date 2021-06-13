import solc from "solc";
import { createLogger } from "../helpers/log";

const logger = createLogger("SOLC_SER");

function checkAndPrepareFiles(files) {
  logger.debug("checkFiles start :", files);
  if (!files && (!Array.isArray(files) || !Array.isArray(files.files))) {
    logger.error("checkFiles :", "Invalid Contract File or Files");
    throw new Error("Invalid Contract File or Files");
  }
  if (typeof files === "object" && Array.isArray(files.files)) {
    files = files.files;
  }
  logger.debug("checkFiles");
}

function getResult(output) {
  let errors = [];
  let warnings = [];

  if (output.errors) {
    logger.error("getResult: ", output.errors);
    warnings = output.errors.filter((error) => {
      return error.type === "Warning";
    });
    errors = output.errors.filter((error) => {
      return error.type === "Error";
    });
  }

  // const firstContractFile = output.contracts[output.main];
  // const firstContract = Object.keys(output.contracts[firstContractFile])[0];

  const compiledContract = output.main[Object.keys(output.main)[0]];
  return {
    compiledMessages: {
      errors,
      warnings,
    },
    abi: compiledContract.abi,
    bytecode: `0x${compiledContract.evm.bytecode.object}`,
    metadata: compiledContract.metadata,
  };
}

function compileFiles(inputFiles) {
  logger.debug("Compile start:", inputFiles);

  checkAndPrepareFiles(inputFiles);
  let files = inputFiles;
  if (!Array.isArray(files)) {
    files = [inputFiles.files];
  }
  const sources = {};
  try {
    for (const file of files) {
      sources[file.name] = {
        content: file.data.toString(),
      };
    }
  } catch (error) {
    logger.error(error);
  }

  const input = {
    language: "Solidity",
    sources,
    settings: {
      outputSelection: {
        "*": {
          "*": ["metadata", "evm.bytecode", "abi"],
        },
      },
    },
  };

  const compiledInput = solc.compile(JSON.stringify(input));
  const output = JSON.parse(compiledInput);
  const compileErrors = output.errors.filter((error) => {
    if (error.severity === "error") {
      return {
        errorCode: error.errorCode,
        message: error.message,
      };
    }
  });
  if (compileErrors.length) {
    const err = compileErrors.map((error) => error.message);
    throw new Error(err);
  }

  for (const entry of Object.entries(output.contracts)) {
    if (Object.entries(entry[1])[0][1].evm.bytecode.opcodes !== "") {
      [, output.main] = entry;
      break;
    }
  }

  return getResult(output);
}
export default compileFiles;

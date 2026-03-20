function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

function summarizeError(error, context) {
  return {
    ok: false,
    context,
    error: error instanceof Error ? error.message : String(error)
  };
}

module.exports = {
  printResult,
  summarizeError
};

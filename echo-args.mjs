// Prints the raw argv its process received. Used to show what real Yarn 4.13
// forwards to a binary for `yarn exec <bin> ...` and `yarn node ...` calls.
console.log(JSON.stringify(process.argv.slice(2)))

const fs = require('fs');

try {
    const buffer = fs.readFileSync('accessibility_test_report.json');
    let content;
    // Handle BOM
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        content = buffer.toString('utf16le');
    } else {
        content = buffer.toString('utf8');
    }

    const report = JSON.parse(content);

    const processSuite = (suite) => {
        if (suite.suites) {
            suite.suites.forEach(processSuite);
        }
        if (suite.specs) {
            suite.specs.forEach(spec => {
                spec.tests.forEach(test => {
                    if (test.status === 'failed') {
                        console.log(`Test: ${spec.title}`);
                        test.results.forEach(result => {
                            result.errors.forEach(error => {
                                console.log(error.message);
                            });
                        });
                    }
                });
            });
        }
    };

    if (report.suites) {
        report.suites.forEach(processSuite);
    }

} catch (e) {
    console.error(e);
}

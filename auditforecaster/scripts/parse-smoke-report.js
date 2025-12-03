const fs = require('fs');

try {
    const buffer = fs.readFileSync('smoke_test_report_7.json');
    let content;
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        content = buffer.toString('utf16le');
    } else {
        content = buffer.toString('utf8');
    }
    content = content.replace(/^\uFEFF/, '');
    const lastBrace = content.lastIndexOf('}');
    if (lastBrace !== -1) content = content.substring(0, lastBrace + 1);

    const report = JSON.parse(content);

    const failures = [];

    function traverse(suite) {
        if (suite.specs) {
            suite.specs.forEach(spec => {
                spec.tests.forEach(test => {
                    if (test.status === 'unexpected' || test.status === 'failed') {
                        failures.push({
                            title: spec.title,
                            error: test.results[0]?.error?.message || 'Unknown error'
                        });
                    }
                });
            });
        }
        if (suite.suites) {
            suite.suites.forEach(childSuite => traverse(childSuite));
        }
    }

    report.suites.forEach(s => traverse(s));

    console.log('Total Tests:', report.stats?.expected);
    console.log('Passed:', report.stats?.expected - report.stats?.unexpected);
    console.log('Failed:', report.stats?.unexpected);
    console.log('Total Failures (Array):', failures.length);
    failures.forEach(f => {
        console.log(`\n[FAIL] ${f.title}`);
        console.log(`Error: ${f.error.split('\n')[0]}`);
    });

} catch (err) {
    console.error(err);
}

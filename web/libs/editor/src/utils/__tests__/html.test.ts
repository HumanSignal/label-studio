import { sanitizeHtml } from '../html';

const htmlSanitizeList = [
  {
    input: '<iframe src="http://malicious.com"></iframe>',
    expected: '',
  },{
    input: '<script>alert(\'XSS\');</script>',
    expected: '',
  }, {
    input: '"><img src=x onerror=alert(\'XSS\')>',
    expected: '"&gt;<img src="x" />',
  },{
    input: '<script>alert(1)</script foo=\'bar\'>',
    expected: '',
  },{
    input: '><script>alert(\'XSS\')</script>',
    expected: '&gt;',
  },{
    input: '<?xml version="1.0" encoding="ISO-8859-1"?><foo><![CDATA[<script>alert(\'XSS\');</script>]]></foo>',
    expected: '<foo></foo>',
  },{
    input: 'It\'s a test to check if <, > and & are escaped',
    expected: 'It\'s a test to check if &lt;, &gt; and &amp; are escaped',
  },
];


describe('Helper function html sanitize', () => {
  test('sanitize html list', () => {
    htmlSanitizeList.forEach((item) => {
      expect(sanitizeHtml(item.input)).toBe(item.expected);
    });
  });
});

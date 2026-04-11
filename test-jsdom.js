const { JSDOM } = require('jsdom'); const dom = new JSDOM('<body><?!= include(\"Foo\"); ?></body>'); console.log(dom.serialize());

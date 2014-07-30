describe('ES6 import statments', function () {
    it('should understand es6 statments', function () {

        // import $ from "jquery";                    // import the default export of a module
        // module crypto from "crypto";               // binding an external module to a variable
        // import { encrypt, decrypt } from "crypto"; // binding a module's exports to variables
        // import { encrypt as enc } from "crypto";   // binding and renaming one of a module's exports

        // Modules
        expect(parse.statement('crypto.sh256').module.name).toBe('crypto.sh256');
        expect(parse.statement('crypto').module.name).toBe('crypto');
        expect(parse.statement('import encrypt from "crypto"').module.name).toBe('crypto');
        expect(parse.statement('module crypto from "crypto.sh256.encrypt";').module.name).toBe('crypto.sh256.encrypt');
        expect(parse.statement('module crypto from \'crypto\';').module.name).toBe('crypto');
        expect(parse.statement('module crypto_string from "crypto";').module.alias).toBe('crypto_string');
        expect(parse.statement('module crypto from "crypto-string";').module.name).toBe('crypto-string');
        expect(parse.statement('import { encrypt, decrypt } from "crypto.sh256";').module.name).toBe('crypto.sh256');
        expect(parse.statement('import { encrypt as enc } from "crypto"; ').module.name).toBe('crypto');

        // Symbols
        expect(parse.statement('import encrypt from "crypto"').symbols[0].name).toBe('encrypt');
    });
});

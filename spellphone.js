/**
 * Node class for directed graph
 */
export class Node {

    constructor(value) {
        this.value = value;
        this.ancestors = [];
        this.descendants = [];
        this.meta = {};
    }

    provideNodeArray(nodes, varName) {
        if (nodes instanceof Node) {
            nodes = [nodes]
        }

        if (!Array.isArray(nodes)) {
            throw 'The ' + varName + ' is not array or Node';
        }

        nodes.forEach(element => {
            if (!element instanceof Node) {
                throw 'The ' + varName + ' contains a none-Node element';
            }
        });

        return nodes;
    }

    addAncestors(ancestors) {
        this.ancestors.push(...this.provideNodeArray(ancestors, 'ancestors'))
    }

    addDescendants(descendants) {
        this.descendants.push(...this.provideNodeArray(descendants, 'descendants'))
    }

    travers(callback, ancestorsRef = []) {

        let ancestors = ancestorsRef.slice(0);

        // prevent loops
        if (ancestors.includes(this)) {
            return callback(ancestors);
        }

        ancestors.push(this);

        // end of path
        if (this.descendants.length === 0) {
            return callback(ancestors);
        }

        this.descendants.forEach(element => element.travers(callback, ancestors));
    }
}

/**
 * Spell Phone class
 */
export class SpellPhone {

    static get wordListResources() {
        return {
            'en': './common_english_words.json'
        }
    };

    static getSupportedLanguages() {
        return Object.keys(SpellPhone.wordListResources);
    }

    static getWordListUrl(lang) {
        if (SpellPhone.getSupportedLanguages().includes(lang)) {
            return SpellPhone.wordListResources[lang];
        }

        return null;
    }

    constructor() {

    }

    _wordList = {};

    /**
     * Add a new word list for a language
     *
     * @param lang
     * @param words
     */
    addWordList(lang, words) {
        this._wordList[lang] = words;
    }


    /**
     * Get an existing word list for a language
     *
     * @param lang
     * @returns {*}
     */
    getWordList(lang) {
        return this._wordList[lang];
    }

    keyMap = {
        '0': ' ',
        '1': '&',
        '2': 'abc',
        '3': 'def',
        '4': 'ghi',
        '5': 'jkl',
        '6': 'mno',
        '7': 'pqrs',
        '8': 'tuv',
        '9': 'wxyz'
    };

    /**
     * Load word list for the input language
     *
     * @param lang
     * @returns {boolean|Promise<void>}
     */
    loadDictionary(lang) {
        const dictionaryUrl = SpellPhone.getWordListUrl(lang);
        if (dictionaryUrl) {
            return this.getJSON(dictionaryUrl)
                .then(response => this.addWordList(lang, response))
                .catch(response => console.log(response));
        }

        return false;
    }

    /**
     * Load a json from a path
     *
     * @param url
     * @returns {Promise<Object>}
     */
    getJSON(url) {
        return new Promise(function (resolve, reject) {
            let request = new XMLHttpRequest();
            request.overrideMimeType('application/json');
            request.open('GET', url, true);
            request.onload = function () {
                if (request.status === 200) {
                    resolve(JSON.parse(request.responseText));
                } else {
                    reject(Error(request.statusText));
                }
            };

            request.onerror = function () {
                reject(Error('There was a network error.'));
            };

            request.send();
        });
    }

    /**
     * Convert a phone number to a list of possible combination of words
     *
     * @param number
     * @param lang
     * @returns {[]}
     */
    convert(number, lang) {

        if (!lang) {
            throw Error('Language argument is not defined.');
        }

        if (!this.getWordList(lang)) {
            throw Error('Word list for this language is not loaded yet.');
        }

        let result = [];
        let nodes = this.generateNodes(number.toString(), lang);
        let wordNodes = [];

        nodes.forEach(pathBegin => {
            pathBegin.travers(function (path) {
                let pathWordNodes = {};
                for (let i = 0; i < path.length; i++) {
                    pathWordNodes[i] = [];
                    path[i].meta.words.forEach(word => pathWordNodes[i].push(new Node(word)));
                }

                for (let i = 1; i < Object.keys(pathWordNodes).length; i++) {
                    pathWordNodes[i - 1].forEach(wordNode => wordNode.addDescendants(pathWordNodes[i]));
                }

                wordNodes = wordNodes.concat(pathWordNodes[0]);
            });
        });

        wordNodes.forEach(wordNode =>
            wordNode.travers(function (path) {
                result.push(path.map(n => n.value).join('-'));
            })
        );

        result.sort(function (a, b) {
            let aValue = a.replace(/-/g, '').replace(/\d/g, "").length - (a.split('-').length - 1);
            let bValue = b.replace(/-/g, '').replace(/\d/g, "").length - (b.split('-').length - 1);

            if (aValue > bValue) {
                return -1;
            }

            if (aValue < bValue) {
                return 1;
            }

            return 0;
        });

        return result
    }

    /**
     * Convert phone number to array of node
     *
     * @param text
     * @param lang
     * @returns Node[]
     */
    generateNodes(text, lang) {
        let nodes = [];

        for (let i = 1; i <= text.length; i++) {
            for (let j = 0; j + i <= text.length; j++) {
                let node = new Node(text.substring(j, j + i));
                node.meta.begin = j;
                node.meta.end = j + i;
                node.meta.words = this.generateWords(node.value, lang);
                node.meta.words.push(node.value);
                nodes.push(node);
            }
        }

        // link nodes
        nodes.forEach(parentNode =>
            parentNode.addDescendants(
                nodes.filter(n => n.meta.begin === parentNode.meta.end)
            )
        );

        return nodes.filter(node => node.meta.begin === 0);
    }

    /**
     * Generate a list of words based on input digits
     *
     * @param value
     * @param lang
     * @returns {[]}
     */
    generateWords(value, lang) {

        let digits = value.split('');

        let nodes = {};
        let self = this;

        for (let i = 0; i < digits.length; i++) {
            const digit = digits[i];
            const chars = self.keyMap[digit].split('');
            nodes[i] = [];

            chars.forEach(char => {
                nodes[i].push(new Node(char));
            });
        }

        for (let i = 1; i < Object.keys(nodes).length; i++) {
            nodes[i - 1].forEach(node => node.addDescendants(nodes[i]));
        }

        let words = [];

        nodes[0].forEach(node => node.travers(function (path) {
            let token = path.map(node => node.value).join('');
            if (self.isWord(token, lang)) {
                words.push(token);
            }
        }));

        return words;
    }

    /**
     * Checks if the token is a known word in the language
     *
     * @param token
     * @param lang
     * @returns {boolean}
     */
    isWord(token, lang) {
        return this.getWordList(lang).includes(token);
    }
}
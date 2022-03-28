/**
 * Node class for directed graph
 */
export class Node {

    /**
     * Prepare the input as an array of nodes
     * @param nodes
     * @param varName
     * @return {Node[]}
     */
    static provideNodeArray(nodes, varName = 'input') {
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

    /**
     * Generate a graph base on input list
     *
     * @param inputArray
     * @param generateNode
     */
    static generateGraph(inputArray, generateNode) {

        if (inputArray.length === 0) {
            return [];
        }

        let graph = {};

        for (let i = 0; i < inputArray.length; i++) {
            let node = generateNode(inputArray[i]);
            graph[i] = Node.provideNodeArray(node);
        }

        for (let i = 1; i < Object.keys(graph).length; i++) {
            graph[i - 1].forEach(node => node.addDescendants(graph[i]));
        }

        return graph[0];
    }

    constructor(value) {
        this.value = value;
        this.descendants = [];
        this.meta = {};
    }

    addDescendants(descendants) {
        this.descendants.push(...Node.provideNodeArray(descendants, 'descendants'))
    }

    removeDescendants(descendants) {
        const descendantsArr = Node.provideNodeArray(descendants, 'descendants');
        this.descendants = this.descendants.filter(d => !descendantsArr.includes(d));
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

    toArray() {
        let array = [];
        this.travers(path => array.push(path));
        return array;
    }
}

/**
 * Spell Phone class
 */
export class SpellPhone {

    static get wordListResources() {
        return {
            'en': {
                source: 'https://cdn.jsdelivr.net/gh/aplumly/array-of-over-3000-english-words/javaArray.txt',
                parser: function (text) {
                    let regex = /"(\w+)"/g;

                    let words = {};
                    let match = regex.exec(text);
                    while (match != null) {
                        words[match[1]] = 1;
                        match = regex.exec(text);
                    }

                    return words;
                }
            }
        }
    };

    static getSupportedLanguages() {
        return Object.keys(SpellPhone.wordListResources);
    }

    static getWordListSource(lang) {
        if (SpellPhone.getSupportedLanguages().includes(lang)) {
            return SpellPhone.wordListResources[lang];
        }

        return null;
    }

    constructor() {

    }

    _wordList = {};

    _numberWordsCache = {};

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
        'en': {
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
        }
    };

    /**
     * Load word list for the input language
     *
     * @param lang
     * @returns {boolean|Promise<void>}
     */
    loadDictionary(lang) {
        const wordListSource = SpellPhone.getWordListSource(lang);
        if (wordListSource) {
            return this.downloadSource(wordListSource.source)
                .then(response => this.addWordList(lang, wordListSource.parser(response)))
                .catch(response => console.log(response));
        }

        return false;
    }

    /**
     * Load a remote source from a path
     *
     * @param url
     * @returns {Promise<Object>}
     */
    downloadSource(url) {
        return new Promise(function (resolve, reject) {
            let request = new XMLHttpRequest();
            request.overrideMimeType('application/json');
            request.open('GET', url, true);
            request.onload = function () {
                if (request.status === 200) {
                    resolve(request.responseText);
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

        let nodes = this.generateNodes(number, lang);
        let paths = [];
        nodes.forEach(node => paths = paths.concat(node.toArray()));

        paths.map(a => {
            a.rank = a.reduce((total, node) => node.meta.rank + total, 0);
            return a;
        });

        paths = paths.filter(a => a.rank > 0);
        paths.sort((a, b) => b.rank - a.rank);

        return paths;
    }

    /**
     * Convert phone number to array of node
     *
     * @param number
     * @param lang
     * @returns Node[]
     */
    generateNodes(number, lang) {

        if (!lang) {
            throw Error('Language argument is not defined.');
        }

        if (!this.getWordList(lang)) {
            throw Error('Word list for this language is not loaded yet.');
        }

        number = number.toString().replace(/\D/gi, '');

        if (number.length === 0) {
            return [];
        }

        let nodes = [];

        for (let i = 1; i <= number.length; i++) {
            for (let j = 0; j + i <= number.length; j++) {
                let node = new Node(number.substring(j, j + i));
                node.meta.begin = j;
                node.meta.end = j + i;
                node.meta.words = this.generateWords(node.value, lang);
                node.meta.words.push(node.value);
                node.meta.rank = (i <= 1 || node.meta.words.length <= 1 ? 0 : i * i);
                nodes.push(node);
            }
        }

        // link nodes
        nodes.forEach(parentNode =>
            parentNode.addDescendants(
                nodes.filter(n =>
                    (n.meta.begin === parentNode.meta.end) &&
                    (n.meta.rank !== 0 || parentNode.meta.rank)
                )
            )
        );

        const numberLength = number.length;
        let hasChanged = true;

        // reject the nodes that do not reach the end of string
        while (hasChanged) {
            hasChanged = false;
            nodes.forEach(node => {
                node.descendants.forEach(function (d, index, object) {
                    if (d.meta.end !== numberLength && d.descendants.length === 0) {
                        object.splice(index, 1);
                        hasChanged = true;
                    }
                })
            });
        }

        // return only the root nodes
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

        let self = this;

        if (!(lang in this._numberWordsCache)) {
            this._numberWordsCache[lang] = {};
        }

        if (value in this._numberWordsCache[lang]) {
            // pass by value
            return this._numberWordsCache[lang][value].slice(0);
        }

        let nodes = Node.generateGraph(value.split(''), digit => {
            const chars = self.keyMap[lang][digit].split('');
            return chars.map(char => new Node(char));
        });

        let words = [];

        nodes.forEach(node => node.travers(path => {
            let token = path.map(node => node.value).join('');
            if (self.isWord(token, lang)) {
                words.push(token);
            }
        }));

        this._numberWordsCache[lang][value] = words.slice(0);

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
        let wordList = this.getWordList(lang);

        if (Array.isArray(wordList)) {
            return wordList.includes(token);
        }

        return wordList[token] && true;
    }
}
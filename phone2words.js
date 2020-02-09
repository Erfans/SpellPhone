

P2W = {
  getJSON: function (url, callback) {
    var xhr = new XMLHttpRequest()
    xhr.overrideMimeType('application/json')
    xhr.open('GET', url, true)
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        callback(JSON.parse(xhr.responseText))
      }
    }
    xhr.send()
  },
  loadDictionary: function (lang) {
    var self = this
    if (this.dictionaryResources[lang]) {
      this.getJSON(this.dictionaryResources[lang], function (json) {
        self.dictionary[lang] = json
      })
    }
  },
  dictionaryResources: {
    'en': 'http://127.0.0.1:8000/phone-to-words/common_english_words.json'
  },
  dictionary: {},
  convert: function (number) {
    var result = []
    var combs = this.combinations(number)
    for (var i = 0; i < combs.length; i++) {
      var comb = combs[i]
      for (var j = 0; j < comb.length; j++) {
        var w = this.doConvert(comb[j])
      }
    }
    return result
  },
  doConvert: function (number) {
    var chars = this.digitsToChars(number)
    var possibleWords = []

    for (var i = 0; i < chars.length; i++) {
      var tempResult = []
      for (var j = 0; j < chars[i].length; j++) {
        if (possibleWords.length) {
          for (var k = 0; k < possibleWords.length; k++) {
            tempResult.push(possibleWords[k].concat(chars[i][j]))
          }
        } else {
          tempResult = chars[i]
        }
      }
      possibleWords = tempResult
    }

    return possibleWords
  },
  digitsToChars: function (number) {
    var chars = []
    var digits = number.split('')
    for (var i = 0; i < digits.length; i++) {
      chars.push(this.keyMap[digits[i]].split(''))
    }
    return chars
  },
  keyMap: {
    '1': '&',
    '2': 'abc',
    '3': 'def',
    '4': 'ghi',
    '5': 'jkl',
    '6': 'mno',
    '7': 'pqrs',
    '8': 'tuv',
    '9': 'wxyz'
  },
  /**
   * @param text
   * @returns {[]}
   */
  combinations: function (text) {
    var result = []

    result.push([text])
    for (var i = 1; i < text.length; i++) {
      var left = text.substring(0, i)
      var right = this.combinations(text.substring(i, text.length))

      for (var j = 0; j < right.length; j++) {
        result.push([left].concat(right[j]))
      }
    }

    return result
  }
}

console.log(P2W.doConvert('123'))

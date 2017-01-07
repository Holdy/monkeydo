function Matcher(text) {
    this.text = text;
    this.lowerCaseText = text.toLowerCase();
    this.bindings = [];
}

Matcher.prototype.matches = function() {
    if (arguments.length === 1) {
        return this.matchesPattern(arguments[0]);
    } else {
        var result = false;
        for (var x = 0; x < arguments.length; x++) {
            var pattern = arguments[x];
            if (this.matchesPattern(pattern)) {
                result = true;
                break;
            }
        }
        return result;
    }
}

Matcher.prototype.matchesPattern = function(pattern) {
    var index = pattern.indexOf('*');

    this.bindings = [];

    if (index == -1) {
        var result = pattern == this.text;
        if (result) {
            this.bindings.push(this.text);
        }
        return result;
    } else {
        var startMatch = true;
        var endMatch = true;
        if (index != 0) {
            var requiredStart = pattern.substring(0, index);
            startMatch = this.lowerCaseText.indexOf(requiredStart) === 0;
        }

        if (startMatch) {
            var binding = this.text.substring(index);
            if (index != pattern.length-1) {
                var requiredEnd = pattern.substring(index+1);
                endMatch = this.lowerCaseText.lastIndexOf(requiredEnd) === this.lowerCaseText.length - requiredEnd.length;
                binding = binding.substring(0, binding.length -requiredEnd.length);
            }

            this.bindings.push(binding);
        }

        return startMatch && endMatch;
    }
}

module.exports = Matcher;

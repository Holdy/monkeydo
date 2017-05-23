
function ActionList() {
    this.list = [];
    this.displayList = [];
}

ActionList.prototype.add = function(action) {
    this.list.push(action);
    this.displayList.push({
        verb: action.verb,
        name: action.name,
        itemCount: action.itemCount,
        startLink: '/do/' + action.verb + '/' + action.name.replace(' ','%20').replace(' ', '%20')
    });
}

function create() {
    return new ActionList();
}

module.exports.create = create;

// TODO
//  - fix parent imbalance (important)
//    * (maybe do not maintain whole selection containers ids,
//    it is enough to save container position relatively to parent id)
//


// Explanations:
// * Model
//
// hash - unique id of element in form of X.X.X.X.X
//        where X is index of childNode at particular dom tree level
// 
// A range can be identified by four elements:
//      - startContainer (represented by hash)
//      - startOffset  (number)
//      - endContainer (represented by hash)
//      - endOffset    (number)
//
// rash - it is range in form X.X.X.X.X-OxX.X.X.X.X-O
//        it is string, formed from above range elements
//
// raob - it is object literal that represents range
//        it has below properties set:
//        startContainer, startOffset, endContainer, endOffset
//
//
// * Storage per domain
// ls = {
//     document.baseURI: {
//        parent1Hash: [{raob_p1_1, raob_p1_2, raob_p1_3, ...],
//        parent2Hash: [{raob_p2_1, raob_p2_2, raob_p2_3, ...],
//        ...
//     } 
// }

kpluszcz_Sel = function() { 
    var that = {};
    var PKG_NAME = "kpluszcz.selections";

    // private
    var ls = window.localStorage;
    var uri = document.baseURI;

    // dom helpers
    var objectPropertyCount = function(obj) {
	var i=0;
	for(var property in obj) {
	    if (obj.hasOwnProperty(property)) {
		i += 1;
	    }
	}
	return i;
    };

    var setObjectProperties = function(obj, props) {
	for(var option in props) {
	    if (props.hasOwnProperty(option)) {
		if (typeof props[option] === "object") {
		    setObjectProperties(obj[option], props[option]);
		} else {
		    obj[option] = props[option];
		}
	    }
	}
    };

    var createElement = function(name, opts) {
	var element = document.createElement(name);
	if (opts !== null) {
	    setObjectProperties(element, opts);
	}
	return element;
    };

    // logic helpers
    // 
    // hash helpers
    var getElementHash = function(element) {
	var parent = element;
	var sibling = element;

	var siblingArray = [];

	do {
	    siblingIndex = -1;
	    do { 
		siblingIndex += 1;
		sibling = sibling.previousSibling;
	    } while (sibling !== null);

	    siblingArray.push(siblingIndex);

	    parent = parent.parentNode;  
	    sibling = parent;
	} while (parent !== null && sibling !== undefined);

	return siblingArray.reverse().join(".");
    };

    var getElementFromHash = function(hash) {
	var array = hash.split(".");
	var element = document.body;
	for(var i=3; i<array.length; i++) {
	    element = element.childNodes(parseInt(array[i], 10));
	}

	return element;
    };

    var changeHashNumber = function(hash, addend) {
	var commaIdx = hash.lastIndexOf(".");
	var lastDigit = hash.slice(commaIdx + 1, hash.length);
	lastDigit = parseInt(lastDigit, 10) + addend;
	return hash.slice(0, commaIdx + 1) + lastDigit;
    };

    // raob helpers
    var getRaobFromRange = function(range) {
	return {
	    startContainer: getElementHash(range.startContainer),
	    startOffset: range.startOffset,
	    endContainer: getElementHash(range.endContainer),
	    endOffset: range.endOffset
	};
    };

    var raobFromString = function(str) {
	var ary = str.split(/-|x/);
	return {
	    startContainer: ary[0],
	    startOffset: ary[1],
	    endContainer: ary[2],
	    endOffset: ary[3]
	};
    };

    var raobToString = function(raob) {
	return raob.startContainer + "-" + raob.startOffset + "x" +
	   raob.endContainer + "-" + raob.endOffset; 
    };

    var raobsEquals = function(r1, r2) {
	return r1.startContainer == r2.startContainer && 
	    r1.endContainer == r2.endContainer && 
	    r1.startOffset == r2.startOffset && 
	    r1.endOffset == r2.endOffset;
    };

    var findRaobIdxInArray = function(tab, raob) {
	var i = 0;
	while(i < tab.length && ! raobsEquals(raob, tab[i])) { i += 1; }
	return i;
    };


    // view
    var createHighlightSpan = function(id) {
	var span = createElement("span", { 
	    id: id,
	    className: PKG_NAME, 
	    style: { background: widget.preferences.markerColor }
	});

	span.addEventListener("mouseUp", function(event) {
	    // if user clicks somegthing within selection
	    if (event.target !== event.currentTarget) return;

	    var parentHash = getElementHash(span.parentNode);
	    console.log("hash of a parent: " + parentHash);

	    var storage = JSON.parse(ls[PKG_NAME]);
	    var domainStorage = storage[uri];
	    var tab = domainStorage[parentHash];

	    // if the selection is the only one per domain
	    if (tab.length === 1) {
		delete domainStorage[parentHash];

		if (objectPropertyCount(domainStorage) === 0) {
		    delete storage[uri];
		}
	    } else {

		// find next to deleted span 
		var sib = getNextSpanSibling(span);

		// if the deleted is last in container
		if(sib === null) {
		    console.log("deleted element is last");
		    tab.pop();
		} else {
		    console.log("the deleted is not last element");
		    console.log("next sibling id " + sib.id);

		    // find his position in storage
		    var i = findRaobIdxInArray(tab, raobFromString(span.id));

		    // delete highlight from tab
		    tab.splice(i, 1);

		    var toAdd;

		    // change offset and container of next element
		    if (span.childNodes.length > 1) {
			console.log("deleted span contains more than one child");
			toAdd = span.lastChild.data.length;
		    } else {
			console.log("deleted span contains one child");
			toAdd = span.innerHTML.length + span.previousSibling.data.length;
		    }

		    // fix start offset
		    if(sib.previousSibling === span.nextSibling ) {
			tab[i].startOffset += toAdd;
		    }

		    if (tab[i].startContainer === tab[i].endContainer) {
			if (sib.previousSibling === span.nextSibling) {
			    tab[i].endOffset = tab[i].endOffset + toAdd;
			}
		    } 

		    // magic number
		    var a = span.childNodes.length - 3;
		    console.log("There will be " + a + " nodes to appear");

		    tab[i].startContainer = changeHashNumber(tab[i].startContainer, a);
		    tab[i].endContainer = changeHashNumber(tab[i].endContainer, a);

		    repairNextHighlights(tab, i, sib, a);
		}
	    }

	    // unpack deleted span and insert its children
	    unpackElement(span);

	    // save. If the deleted was the last record, delete all
	    if (! storage[uri] && objectPropertyCount(storage) === 0) {
		ls.removeItem(PKG_NAME);
	    } else {
		ls[PKG_NAME] = JSON.stringify(storage);
	    }
	}, false);

	return span;
    };

    var unpackElement = function(elem) {
	var parent = elem.parentNode;
	var prev = elem.previousSibling;
	var next = elem.nextSibling;

	if (elem.childNodes.length === 1) {
	    prev.data += elem.innerText + next.data;
	    parent.removeChild(next);
	} else {
	    prev.data += elem.childNodes[0].data;
	    for(i=1; i<elem.childNodes.length -1; ++i) {
		var node = elem.childNodes[i].cloneNode(true);
		parent.insertBefore(node, elem);
	    }
	    next.data = elem.childNodes[i].data + next.data;
	}
	parent.removeChild(elem);
    };

    var highlightRange = function(range, raob) {
	var span = createHighlightSpan(raobToString(raob));
	range.surroundContents(span);
	return span;
    };

    // get next highlight span at the same level as span
    var getNextSpanSibling = function(span) {
	var sib = span.nextSibling;
	while(sib !== null && sib.className !== PKG_NAME) {
	    sib = sib.nextSibling;
	}
	return sib;
    };

    // repair remaining highlights in view and in model
    var repairNextHighlights = function(tab, i, span, addend) {
	span.id = raobToString(tab[i]); 

	// change remaining highlight spans containers
	for(i=i+1; i<tab.length; ++i) {
	    span = document.getElementById(raobToString(tab[i]));
	    tab[i].startContainer = changeHashNumber(tab[i].startContainer, addend);
	    tab[i].endContainer = changeHashNumber(tab[i].endContainer, addend);
	    span.id = raobToString(tab[i]);
	}
    };

    var storeSelection = function(sel) {
	console.log("storing selection");

	var range = sel.getRangeAt(0);
	var raob = getRaobFromRange(range);

	// colud be endContainer as well
	var parent = range.commonAncestorContainer;

	while(parent.nodeType === 3) {
	    parent = parent.parentNode;
	}

	console.log(getElementHash(range.startContainer.parentNode));
	console.log(getElementHash(parent));

	var parentHash = getElementHash(range.startContainer.parentNode);
	var storage = ls[PKG_NAME] ? JSON.parse(ls[PKG_NAME]) : {};
	var newSpan = highlightRange(range, raob);

	// check if URI conaints selections
	if (storage[uri] === undefined) {
	    console.log("URI does not contain any selection");
	    storage[uri] = {};
	    storage[uri][parentHash] = [raob];

	} else {
	    console.log("URI contains selections");

	    // store and repair
	    if (storage[uri][parentHash] === undefined) {
		console.log("this parent does not contain selections");
		storage[uri][parentHash] = [raob];
	    } else {
		var tab = storage[uri][parentHash];

		console.log("this parent contains " + tab.length + " selections");

		// find next highlight span 
		var sib = getNextSpanSibling(newSpan);

		// element is last
		if (sib === null) {
		    console.log("new element is the last");
		    tab.push(raob);
		} else {
		    console.log("new is not last element");
		    console.log("next sibling id " + sib.id);

		    // find his position in storage
		    i = findRaobIdxInArray(tab, raobFromString(sib.id));

		    // insert new element at position i
		    tab.splice(i, 0, raob);

		    // change endOffset when the same containers
		    if (tab[i+1].startContainer === tab[i+1].endContainer) {
			tab[i+1].endOffset = sib.previousSibling.data.length + sib.innerText.length;
		    }

		    // magic number
		    var a = - newSpan.childNodes.length + 3;
		    console.log("There will be " + a + " nodes to hide ");

		    tab[i+1].startContainer = changeHashNumber(tab[i+1].startContainer, a);
		    tab[i+1].startOffset = sib.previousSibling.data.length;
		    tab[i+1].endContainer = changeHashNumber(tab[i+1].endContainer, a);

		    repairNextHighlights(tab, i+1, sib, a);
		}
	    }

	}

	ls[PKG_NAME] = JSON.stringify(storage);
    };

    // read selection and mark!
    that.markSelections = function() {
	if(ls[PKG_NAME] !== undefined) {

	    var storage = JSON.parse(ls[PKG_NAME]);
	    if (storage.hasOwnProperty(uri)) {
		var domainStorage = storage[uri];

		for(var parent in domainStorage) {
		    if (domainStorage.hasOwnProperty(parent)) {
			var tab = domainStorage[parent];

			for(var i=0; i<tab.length; ++i) {
			    var range = document.createRange();

			    var sC = getElementFromHash(tab[i].startContainer);
			    var eC = getElementFromHash(tab[i].endContainer);

			    // range properties
			    range.setStart(sC, tab[i].startOffset);
			    range.setEnd(eC, tab[i].endOffset);

			    highlightRange(range, tab[i]);
			}
		    }
		}//for
	    }
	}//if 
    };

    that.mouseUpHandler = function(event) {
	var sel = window.getSelection();
	var hotkey = widget.preferences.hotkey;
	// jest zaznaczenie oraz wciśnięty klawisz
	if (sel.toString() !== '' && event[hotkey]) {
	    storeSelection(sel);
	}
    };

    return that;
};

var kpluszcz_sel = kpluszcz_Sel();

console.log("selections");
document.addEventListener("mouseUp", kpluszcz_sel.mouseUpHandler, false);
window.addEventListener("DOMContentLoaded", kpluszcz_sel.markSelections, false);

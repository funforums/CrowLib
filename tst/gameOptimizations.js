goog.require('crow.Graph');
goog.require('crow.BaseNode');
goog.require('goog.events.EventTarget');
goog.require('crow.util.Test');

window["test"] = window["test"] || {};
window["test"]["gameOptimizations"] = function(){
	/**
	 * @constructor
	 */
	function MyNode(arr){ this.x = arr[0]; this.y = arr[1]; };
	MyNode.prototype = new crow.BaseNode();
	MyNode.prototype.getX = function(){ return this.x; };
	MyNode.prototype.getY = function(){ return this.y; };
	MyNode.prototype.distanceAlgorithm = crow.GraphUtil.distance.manhattan8;

	var tinyGraph = function(){
		return crow.Graph.fromArray([
			"XX-",
			"-X-",
			"-XX"
		], function(x, y, val){
			if(val == "X") return new MyNode([x, y]);
		});
	};
	function mediumGraph(){
		return crow.Graph.fromArray([
			"1111",
			"1001",
			"1111",
			"0100"
		], function(x, y, val){
			if(val === "1"){
				return new MyNode([x, y]);
			}
		});
	}
	function lpaGraph(){
		// from the LPA* paper
		return crow.Graph.fromArray([
			"1111",
			"0101",
			"0101",
			"0101",
			"0101",
			"1111"
		], function(x, y, val){
			if(val === "1"){
				return new MyNode([x, y]);
			}
		});
	}
	function lpaGraph2(){
		// from the LPA* paper
		return crow.Graph.fromArray([
			"1111111111",
			"0111111111",
			"0111111111",
			"0111111111",
			"0111111111",
			"1111111111"
		], function(x, y, val){
			if(val === "1"){
				return new MyNode([x, y]);
			}
		});
	}

	function mountainTunnel(){
		var graph = crow.Graph.fromArray([
			"00111",
			"00101",
			"00101",
			"11111",
			"10001",
			"11111"
		], function(x, y, val){
			if(val === "1"){
				return new MyNode([x, y]);
			}
		});
		return graph;
	}

	test("invalidate point, a*", function(){
		var graph = tinyGraph();
		var path = graph.findGoal({start: graph.getNode(0, 0), goal: graph.getNode(2, 2), algorithm: "a*", baked: false});

		var expected = [[0,0],[1,0],[1,1],[1,2],[2,2]];
		for(var i = 0; i < expected.length; i++){
			deepEqual([path.nodes[i].getX(), path.nodes[i].getY()], expected[i], "initial: path node " + i + " is as expected");
		}

		// Now we remove a point and signal to our graph that any paths containing that point
		// are no longer valid after that point
		graph.removeNode(1, 2);
		graph.invalidate(1, 2);

		// After we invalidate the point, we can regenerate the rest of the graph
		path.continueCalculating();

		ok(!path.found, "deleted only available path; can't find new path");

		equal(path.nodes.length, 1, "busted path is shorter");

		// Now let's add another node making it possible to find the goal
		graph.addNode(new MyNode([2, 1]));
		// We don't need to invalidate the point because we know the path doesn't contain it
		path.continueCalculating();
		ok(path.found, "after adding new node, path is found again");

		var expected = [[0,0],[1,0],[1,1],[2,1],[2,2]];
		for(var i = 0; i < expected.length; i++){
			deepEqual([path.nodes[i].getX(), path.nodes[i].getY()], expected[i], "new path: node " + i + " is as expected");
		}
	});

	test("invalidate area, a*", function(){
		var graph = tinyGraph();
		var path = graph.findGoal({start: graph.getNode(0, 0), goal: graph.getNode(2, 2), algorithm: "a*", baked: false});

		var expected = [[0,0],[1,0],[1,1],[1,2],[2,2]];
		for(var i = 0; i < expected.length; i++){
			deepEqual([path.nodes[i].getX(), path.nodes[i].getY()], expected[i], "initial: path node " + i + " is as expected");
		}

		// Now we remove a point and signal to our graph that any paths containing that point
		// are no longer valid after that point
		graph.removeNode(1, 2);
		graph.invalidate(0, 1, 2, 2);

		equal(path.nodes.length, 1, "incomplete path is shorter");

		// After we invalidate the point, we can regenerate the rest of the graph
		ok(!path.found, "deleted only available path; can't find new path");

		// Now let's add another node making it possible to find the goal
		graph.addNode(new MyNode([2, 1]));
		// We don't need to invalidate the point because we know the path doesn't contain it
		path.continueCalculating();
		ok(path.found, "after adding new node, path is found again");

		var expected = [[0,0],[1,0],[1,1],[2,1],[2,2]];
		for(var i = 0; i < expected.length; i++){
			deepEqual([path.nodes[i].getX(), path.nodes[i].getY()], expected[i], "new path: node " + i + " is as expected");
		}
	});

	test("invalidate point, dijkstra", function(){
		var graph = tinyGraph();
		var path = graph.findGoal({start: graph.getNode(0, 0), goal: graph.getNode(2, 2), baked: false});

		var expected = [[0,0],[1,0],[1,1],[1,2],[2,2]];
		for(var i = 0; i < expected.length; i++){
			deepEqual([path.nodes[i].getX(), path.nodes[i].getY()], expected[i], "initial: path node " + i + " is as expected");
		}

		// Now we remove a point and signal to our graph that any paths containing that point
		// are no longer valid after that point
		graph.removeNode(1, 2);
		graph.invalidate(1, 2);

		// After we invalidate the point, we can regenerate the rest of the graph
		path.continueCalculating();

		ok(!path.found, "deleted only available path; can't find new path");

		equal(path.nodes.length, 1, "busted path is indeed shorter");

		// Now let's add another node making it possible to find the goal
		graph.addNode(new MyNode([2, 1]));
		// We don't need to invalidate the point because we know the path doesn't contain it
		path.continueCalculating();
		ok(path.found, "after adding new node, path is found again");

		var expected = [[0,0],[1,0],[1,1],[2,1],[2,2]];
		for(var i = 0; i < expected.length; i++){
			deepEqual([path.nodes[i].getX(), path.nodes[i].getY()], expected[i], "new path: node " + i + " is as expected");
		}
	});

	test("invalidate point, lpa*", function(){
		window.debugLPA = function(algo){
			//$("#prelude").empty().append(algo.debugGraph());
		}

		var graph = lpaGraph();
		var path = graph.findGoal({start: graph.getNode(3, 0), goal: graph.getNode(0, 5), algorithm: "lpa*", baked: false, diagonals: true});
		var expected = [[3,0],[2,0],[1,1],[1,2],[1,3],[1,4],[0,5]];
		for(var i = 0; i < expected.length; i++){
			deepEqual([path.nodes[i].getX(), path.nodes[i].getY()], expected[i], "initial: path node " + i + " is as expected");
		}

		// Now we remove a point and signal to our graph that any paths containing that point
		// are no longer valid after that point
		graph.removeNode(1, 3);
		graph.invalidate(1, 3);

		// After we invalidate the point, we can regenerate the rest of the graph

		path.continueCalculating();

		ok(path.found, "found a new path");
		/*
		var expected = [[0,0],[1,0],[1,1]];
		for(var i = 0; i < expected.length; i++){
			deepEqual([path.nodes[i].getX(), path.nodes[i].getY()], expected[i], "busted: path node " + i + " is as expected");
		}
		equal(path.nodes.length, 3, "busted path is indeed shorter");

		// Now let's add another node making it possible to find the goal
		graph.addNode(new MyNode([2, 1]));
		// We don't need to invalidate the point because we know the path doesn't contain it
		path.continueCalculating();
		ok(path.found, "after adding new node, path is found again");

		var expected = [[0,0],[1,0],[1,1],[2,1],[2,2]];
		for(var i = 0; i < expected.length; i++){
			deepEqual([path.nodes[i].getX(), path.nodes[i].getY()], expected[i], "new path: node " + i + " is as expected");
		}
		*/
	});
	test("invalidate point, lpa* again", function(){
		window.debugLPA = function(algo, dontClear){
			if(!dontClear){
				$("#prelude").empty();
			}
			$("#prelude").append(algo.debugGraph());

		}

		var graph = lpaGraph2();
		var path = graph.findGoal({start: graph.getNode(0, 0), goal: graph.getNode(0, 5), algorithm: "lpa*", baked: false, diagonals: true});

		// Now we remove a point and signal to our graph that any paths containing that point
		// are no longer valid after that point
		graph.removeNode(1, 3, true);
		graph.removeNode(2, 3, true);
		graph.removeNode(3, 3, true);
		window.lpaGraph = graph;
		window.lpaPath = path;

		// After we invalidate the point, we can regenerate the rest of the graph

		path.continueCalculating();
	});

	test("a* optimum performance", function(){
		var graph = mountainTunnel();
		var aPath = graph.findGoal({start: graph.getNode(0, 3), goal: graph.getNode(4, 3), algorithm: "a*", baked: false});
		var lpaPath = graph.findGoal({start: graph.getNode(0, 3), goal: graph.getNode(4, 3), algorithm: "lpa*", baked: false});
		graph.removeNode(3, 3, true);
		aPath.continueCalculating();
		lpaPath.continueCalculating();
		ok(aPath.found, "a* path found");
		ok(lpaPath.found, "lpa* path found");
	});

	$.getScript("http://www.effectgames.com/effect/engine/engine-1.0b2d.js", function(){
		module("EffectGames");
		test("fromTilePlane", function(){
			var rawMap = [
				"OXO",
				"OOO",
				"OXX"
			];
			var map = [];
			for(var i = 0; i < rawMap.length; i++){
				var row = rawMap[i];
				var newRow = [];
				for(var ch_idx = 0; ch_idx < row.length; ch_idx++){
					var ch = row.charAt(ch_idx);
					if(ch == "O") {
						var n = new Tile();
						newRow.push(n);
					} else {
						newRow.push(undefined);
					}
				}
				map.push(newRow);
			};
			var tp = new TilePlane();
			tp.map = map;
			window.maxTilePlane = tp;
		});
	});

}

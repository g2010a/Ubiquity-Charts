/* Graphs pie, bar, and line charts.
*  Updated to the new parser by Ammad http://github.com/ammad
*  Extended to use different decimal separators by Armando
*/
var decsep = ".";
var colors = "&chco=94B6D2,D6AA20,759E00,D8773A,007777,B53A3A,713871,4A6E21,979000",
    //"&chco=7979B2,C6C6FF,E0E0FF,B2A567,FFF5C6";
    noun_type_chart = new CmdUtils.NounType( "chart",
      ["pie", "bar", "line", "tline"], "pie"
    ),
    noun_type_width_height = new CmdUtils.NounType( "width[xheight]",
      /^\d+(x\d+)?$/, "400x200"
    ),
	noun_type_decimal_separator = new CmdUtils.NounType( "separator",
      [".", ","], "."
    );
 
function to_num(text){
  if(decsep == ",") text = text.replace(".","").replace(",",".");
  return +text.replace(/[^\d\.]/g,"")
}

/**
 * retrieves selected table from DOM
 */
function getTable(selection){
  var table = {
    firstrow: selection.getRangeAt(0).startContainer,
    lastrow: selection.getRangeAt(selection.rangeCount-1).endContainer
  };
  // for single (non-ctrl) selections
  if (selection.rangeCount == 1) {
    table = {
      firstcell: jQuery(table.firstrow).closest("td,th")[0],
      lastcell: jQuery(table.lastrow).closest("td,th")[0],
      firstrow: jQuery(table.firstrow).closest("tr")[0],
      lastrow: jQuery(table.lastrow).closest("tr")[0]
    }
  };
  if (!table.lastrow) return;
  table.rows = table.lastrow.rowIndex - table.firstrow.rowIndex + 1;
  if (selection.rangeCount > 1) {
    table.columns = selection.rangeCount/table.rows;
    var text = selection.getRangeAt(0).toString();
    jQuery(table.firstrow.children).each(
      function(){
        table.firstcell = this;
        return !!this.textContent.search(text)
      });
    text = selection.getRangeAt(selection.rangeCount-1).toString();
    table.lastcell = table.lastrow.children[table.columns + table.firstcell.cellIndex - 1];
    if (table.lastcell.textContent == text) return table;
    jQuery(table.lastrow.children).each(
      function(){
        table.lastcell = this;
        return !!this.textContent.search(text)
      });
  }
  return table;
}

/**
 * Returns an array of the actual text in the cells 
 */
function tableToArray(table){
  if ( table.firstrow ) var info = table;
  var table = $( table.firstrow || table ).closest("table");
  if ( table.length == 0 ) return;
  return table.find("tr").map(
    function(i){
      if ( info && ( i < info.firstrow.rowIndex ||
                     i > info.lastrow.rowIndex )) return null;
      return $(this.children).map(
        function(j){
          if ( info && ( j < info.firstcell.cellIndex ||
                     j > info.lastcell.cellIndex )) return null;
          return $(this).text()
        })
    })
}
 
/**
 * Returns an object with labels and other relevant data; transforms cells into numbers.
 */
function graphObj(tableData){
  var rows = tableData.length;
  var columns = tableData[0].length;
 
  var data = {
    labels: new Array(rows),
    values: new Array(rows),
    min: Number.MAX_VALUE,
    max: Number.MIN_VALUE,
    string: tableData
  }
  
  // copy the first column into a array of labels, rest into 2 dimensional array of values
  for(i=0; i<rows; i++) {
	// create generic labels if only 1 column is selected
	if (columns == 1) {
		data.labels[i] = i;
		data.values[i] = new Array(1)
		data.values[i][0] = to_num(tableData[i][0]);
	    if (data.values[i][0]<data.min) data.min = data.values[i][0];
		if (data.values[i][0]>data.max) data.max = data.values[i][0];

	}
	else {
		data.labels[i] = tableData[i][0];
		data.values[i] = new Array(columns-1);
		for (var j=1;j<columns; j++){
		  data.values[i][j-1] = to_num(tableData[i][j]);
		  if (data.values[i][j-1]<data.min) data.min = data.values[i][j-1];
		  if (data.values[i][j-1]>data.max) data.max = data.values[i][j-1];
		}
	}
  }
 
  return data;
}
 
 
function transposeArray(inArray){
  var rowsIn = inArray.length;
  var columnsIn = inArray[0].length;
  var outArray = new Array(columnsIn);
 
  for(i=0; i<columnsIn; i++) {
    outArray[i] = new Array(rowsIn);
    for (var j=0;j<rowsIn; j++){
      outArray[i][j] = inArray[j][i];
    }
  }
  return outArray;
}
 
function formatValues(valArray) {
  var rows = valArray.length;
  var columns = valArray[0].length;
  var values = "";
 
  //  traverse table by columns to build values: delimit columns with commas, rows with pipes
  for (var i=0; i<columns; i++){
    for (var j=0;j<rows; j++){
      values += (valArray[j][i]);
      if (j<rows-1) values += ",";
    }
    if (i<columns-1) values += "|";
  }
  return values;
}
 
function formatLabels(labArray){
  var rows = labArray.length;
  var labels = "";
  for(var i=0; i<rows; i++){
    // add element to label string
    labels += labArray[i];
    // if not last row, add a pipe delimiter
    if (i<rows-1) labels += "|";
  }
  return labels;
}
  
function scaleTo100(valArray, maxVal){
  var rows = valArray.length;
  var columns = valArray[0].length;
  var rescale = maxVal / 100;
 
  //  traverse table by columns to build values: delimit columns with commas, rows with pipes
  for (var i=0; i<columns; i++){
    for (var j=0;j<rows; j++){
      valArray[j][i] = valArray[j][i] / rescale;
    }
  }
  return valArray;
}
 
function  dataToChart( args ) {
  var data, table = getTable( CmdUtils.getWindow().getSelection() );
  decsep = args.instrument.text;
  if (table)
    data = graphObj(tableToArray(table));
 
  if( !data ) return null;
  
  data.labelquery = formatLabels(data.labels);
  // pie charts only handle values up to 100, so scale them!
  if( args.format.text == "pie" )
    data.values = scaleTo100(data.values, data.max);
  else if ( args.format.text == "tline" ) {
    data.values = transposeArray(data.values);
    args.format.text = "line";
  }
  data.valuequery = formatValues(data.values);
 
  [ graphWidth, graphHeight ] = args.modifier.text.split("x");
 
  var graphWidth = graphWidth || 400,
      graphHeight = graphHeight || graphWidth /2;
 
  if (graphHeight > 387) graphHeight = 387;
  if (graphWidth > 774) graphWidth = 774;
 
  if ( args.format.text == "bar" ) {
    var ymin = (data.min * 0.75);
    if (ymin < 10) ymin = 0;
    if (data.max > 80 && data.max < 100) data.max = 100;
  }else if ( args.format.text == "line" )
    var ymin = (data.min - (data.max - data.min) * .1);
  
  var urlstart = ({ 
        pie:"pc",
        bar:"bvg&chxt=y&chbh=a",
        line:"lc&chxt=y"
      })[args.format.text],
 
      urlend = ({ 
        pie:"",
        bar:colors,
        line:colors
      })[args.format.text];
 
  img = "<img src='http://chart.earth2marsh.apigee.com/chart?cht="+urlstart+"&chs="+graphWidth+"x"+graphHeight+"&chl="+data.labelquery+"&chd=t:"+data.valuequery+"&chds="+ymin+","+data.max+"&chtxt=x,y&chxr=0,"+ymin+","+data.max+urlend+"'/>";
  return img;
 
}
 
CmdUtils.CreateCommand({
  names: ["chart"],
  arguments: [ {role: "object", nountype: noun_arb_text, label: "Column of labels and column(s) of values"},
               {role: "format", nountype: noun_type_chart},
               {role: "modifier", nountype: noun_type_width_height},
			   {role: "instrument", nountype: noun_type_decimal_separator}
             ],
  icon: "chrome://ubiquity/skin/icons/calculator.png",
  description: "Turn numeric data into charts using the Google Charts API.",
  help: "Select a table. Chart types supported: pie, bar, line and tline(transposed line graph). Decimal separators: \".\" and \",\"<p>Example: <em>Chart in Line of 500x500 with ,</em></p>",
  homepage: "http://earth2marsh.com/ubiquity/",
  author: {name: "Marsh Gardiner", email: "ubiquity@earth2marsh.com"},
  license: "MPL",
 
  preview: function(pblock, args) {
    if (!args.object.html) {
      this.previewDefault(pblock);
      return;
    }
    var img = dataToChart( args );
 
 
    if( !img )
      jQuery(pblock).text( "Requires numbers to graph." );
    else
      jQuery(pblock).empty().append( img ).height( "15px" );
  },
 
  execute: function( args ) {
    var img = dataToChart( args );
    if( img ) CmdUtils.setSelection( img );
  }
});

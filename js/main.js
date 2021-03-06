function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCaretCharacterOffsetWithin(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ( (sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}

function removeEntity(identifier){
	$('[data-entity-id-marked="'+identifier+'"]')[0].outerHTML = $('[data-entity-id-marked="'+identifier+'"]')[0].innerHTML;
	$('[data-entity-id-JSON="'+identifier+'"]')[0].outerHTML = "";
}


function RefreshData(){
	var annotationRawData = localStorage.getItem("spacy-annotation-raw-data");
	if(annotationRawData == null){
		localStorage.setItem("spacy-annotation-raw-data","");
		annotationRawData = ""
	}
	var annotationCompletedData = localStorage.getItem("spacy-annotation-completed-data");
	if(annotationCompletedData == null){
		localStorage.setItem("spacy-annotation-completed-data","");
		annotationCompletedData = ""
	}
	var numberOfSamples = localStorage.getItem("spacy-annotation-sample-count");
	if(numberOfSamples == null || numberOfSamples == 0){
		localStorage.setItem("spacy-annotation-sample-count","");
		numberOfSamples = 1;
	}
	$("#raw-data-div").html(annotationRawData);
	var remainingSampleData = $("#raw-data-div div").length;
	$("#completion-percent").attr("value",(numberOfSamples-remainingSampleData)/numberOfSamples*100);
	$("#annotation-text").html($(".raw-data-row:first-child").html());
	$("#completed-data-div").html(annotationCompletedData);
	$("#annotation-ner").html(localStorage.getItem("spacy-annotation-entity-names"));
}

function prepareJSONData(){
	$(".JSONdelete").html("");
	var JSONOutContents = $("#JSON-out").text();
	JSONOutContents = JSONOutContents.substring(0, JSONOutContents.length - 1);
	var annotationSentence = $(".raw-data-row:first-child").html();
	var JSONData = "(\""+annotationSentence+"\",{\"entities\":["+JSONOutContents+"]}),";
	return(JSONData);
}

$(document).ready(function(){
	
	$('mark').append(`<span class="position-absolute top-0 start-100 translate-middle p-2 bg-danger border border-light rounded-circle"></span>`);
	PerformTextSplicing();
	$.when(TagExistingNames()).then(UpdateDictionary()).then(PopulateTree()).then($('#annotationtree').jstree());
	RefreshData();
	
	$('mark').delegate('.rounded-circle', 'click', function(){
		var SentKey = $(this).closest('mark').data('sentkey');
		var ParaKey = $(this).closest('mark').parent().data('parakey');
		if(SentKey){RawTextParas[ParaKey].sentences[SentKey].sentinfo = [];}
		$(this).closest('mark').children().eq(0).remove();
		var txt = $(this).closest('mark').text().replace(/\s+/g, ' ').trim();
		$(this).closest('mark').replaceWith(txt);
		if(SentKey){
			$('#annotationtree').jstree(true).destroy();
			$.when(UpdateDictionary(SentKey,ParaKey)).then(PopulateTree()).then($('#annotationtree').jstree());		
		}		
	});

	$('.entities').delegate('.entity', 'click', function(){
		alert('hello world');
	});

	$("#btn_addentity").on("click",function(){
		var entityNameValue = $("#txt_entityname").val();
		if(entityNameValue != ''){
			if(ExtendedContains($("#txt_entityname").val()) == -1){
				$("#annotation-ner").append("<button class = 'ner-button' style='background-color:rgb("+getRandomInt(128,255)+","+getRandomInt(128,255)+","+getRandomInt(128,255)+");'>"+entityNameValue+"</div>");
				localStorage.setItem("spacy-annotation-entity-names",$("#annotation-ner").html());
				RefreshData();
				$("#txt_entityname").val('');
			}			
		}
		
	});
	$(document).on("click",".ner-button",function(){
		var entityText = $.trim(window.getSelection().toString());
		var entityTextLength = entityText.length;
		var entityType = this.innerHTML;
		sel = window.getSelection();
		if (sel.rangeCount) {
			range = sel.getRangeAt(0);
			var entityID = Math.round(Math.random()*1000000000000).toString();
			caretPos = getCaretCharacterOffsetWithin(document.getElementById("DOIText"));
			var nodeText = `<mark class="entity tagged new" style="background: ${this.style.backgroundColor}; padding: 0.45em 0.6em; margin: 0px 0.25em; line-height: 1; border-radius: 0.35em;">
			${entityText} <span style="font-size: 0.8em; font-weight: bold; line-height: 1; border-radius: 0.35em; vertical-align: middle; margin-left: 0.5rem">${$(this).text()}</span>
		<span class="position-absolute top-0 start-100 translate-middle p-2 bg-danger border border-light rounded-circle"></span></mark>`
			//nodeText = "<div id='ner-div' data-entity-id-marked = '"+entityID+"' style='background-color:"+this.style.backgroundColor+"'>"+entityText+"</div>";
			document.execCommand("insertHTML",false,nodeText);
			$('#annotationtree').jstree(true).destroy();
			RawTextParas = {};			
			$.when(PerformTextSplicing()).then(UpdateDictionary()).then(PopulateTree()).then($('#annotationtree').jstree());
		}
		// var entityStartPosition = caretPos - entityTextLength;
		// var entityEndPosition = caretPos;
		//$("#JSON-out").append("<div data-entity-id-JSON = '"+entityID+"' class='entity-JSON' style='background-color:"+this.style.backgroundColor+"'>("+(entityStartPosition)+","+entityEndPosition+",\""+entityType+"\"),<div data-entity-id-jsonx = '"+entityID+"' class='JSONdelete'>x</div></div>");
	});
	$(document).on("dblclick","#ner-div",function(){
		removeEntity($(this).data("entity-id-marked"));
	});
	$(document).on("click",".JSONdelete",function(){
		removeEntity($(this).data("entity-id-jsonx"));
	});
	$("#raw-data-div").bind("paste",function(e){
		var pastedData = e.originalEvent.clipboardData.getData('text');
		e.preventDefault();
		//alert(pastedData);
		rawDataArray = pastedData.split("\n");
		var numberOfSamples = rawDataArray.length;
		localStorage.setItem("spacy-annotation-sample-count",numberOfSamples);
		preparedRawData = "";
		rawDataArray.forEach(function(rawData){
			preparedRawData += "<div class = 'raw-data-row'>"+rawData.replace(/[^\x00-\x7F]/g, "").replace(/\"/g,"")+"</div>"
		});
		localStorage.setItem("spacy-annotation-raw-data",preparedRawData);
		$("#raw-data-div").html(localStorage.getItem("spacy-annotation-raw-data"));
		//$("#annotation-text").html($(".raw-data-row:first-child").html());
		RefreshData();
	});
	$("#mark-complete-button").on("click",function(){
		var annotationCompletedData = localStorage.getItem("spacy-annotation-completed-data");
		localStorage.setItem("spacy-annotation-completed-data",prepareJSONData()+"<br/>"+annotationCompletedData);
		$(".raw-data-row:first-child").remove();
		$("#JSON-out").html("");
		var updatedRawData = $("#raw-data-div").html();
		localStorage.setItem("spacy-annotation-raw-data",updatedRawData);
		RefreshData();
	});
	$("#clear-raw").on("click",function(){
		localStorage.setItem("spacy-annotation-raw-data","");
		RefreshData();
	});
	$("#clear-completed").on("click",function(){
		localStorage.setItem("spacy-annotation-completed-data","");
		RefreshData();
	});
	$("#clear-entity-button").on("click",function(){
		localStorage.setItem("spacy-annotation-entity-names","");
		RefreshData();
	});
	$("#annotation-text").keypress(function(e) {
		e.preventDefault();
	});
	$('#downloadinfo').on('click', function(){ DownloadInformationDictionary(JSON.stringify(RawTextParas),'DOIInfo.json','json'); });
});
var RawTextParas = {};
var Entities = [];
function PerformTextSplicing()
{	
	$('.entities').each(function(i, val){ $(val).attr('data-ParaKey','Para-'+i.toString()); });
	var ClonedDivs = $('.entities').clone();
	$(ClonedDivs).find('span').remove();
	var ParaStart = 0;
	$(ClonedDivs).each(function(i, val){ 
		var Para = String($(val).text()).replace(/\s+/g, ' ').trim();
		var ParaKey = 'Para-' + i;
		RawTextParas[ParaKey] = {'paratext': Para, start: ParaStart, end: (ParaStart +  Para.length + 1), sentences: {}};
		ParaStart += Para.length + 2;
		var Pattern =  /[.?!]\s[A-Z]+/g;
		var StartValue = 0;
		var SentId = 0;
		while(match = Pattern.exec(Para)){
			//RawTextParas[Para].push(Para.substring(StartValue, Pattern.lastIndex-2)); this is to implement array of sentences
			RawTextParas[ParaKey].sentences['Sent-'+SentId]= {'senttext': Para.substring(StartValue, Pattern.lastIndex-2),start:StartValue, end: Pattern.lastIndex-2, sentinfo: [] }; // for dictionary implementation
			StartValue = Pattern.lastIndex-1;
			SentId ++;
	}
	// RawTextParas[Para].push(Para.substring(StartValue-1)); for last sentence of para in array
	RawTextParas[ParaKey].sentences['Sent-'+SentId] = {'senttext' : Para.substring(StartValue-1), start:StartValue, end: (StartValue + Para.substring(StartValue-1).length), sentinfo: [] }; // for last sentence of para in dictionary
	});
}

function UpdateEntitiesArray()
{
	Entities = [];
	Entities = $.parseHTML(localStorage.getItem("spacy-annotation-entity-names"));	
}

function ExtendedContains(TexttoSearch)
{
	var Position = -1;
	$(Entities).each(function(i, val){
		if (String($(val).text()).replace(/\s+/g, ' ').trim().toLowerCase() == String(TexttoSearch).replace(/\s+/g, ' ').trim().toLowerCase())
		{
			Position = i;
			return false;
		}
	});	
	return Position;
}

//Not requred funciton.... may be used someother way
function UpdateDictionary1()
{
	var sentenceposition = 0;
	$('.tagged').each(function(i, val){		
		var clonedmark = $(val).clone();
		$(clonedmark).find('span').remove();
		var markertext = String($(clonedmark).text()).replace(/\s+/g, ' ').trim();;
		var ParaKey = $(val).parent().data('parakey');
		var RetValue = GetSentenceOfWord(ParaKey,markertext,sentenceposition);
		sentenceposition = RetValue[1];
		var sentencetext = RawTextParas[ParaKey].sentences['Sent-'+sentenceposition].senttext;
		if(sentencetext.includes(markertext)){
			RawTextParas[ParaKey].sentences['Sent-'+sentenceposition].sentinfo.push({'word': markertext, 'tag': $(val).find('span:first').text(), 'start': sentencetext.indexOf(markertext), 'end': sentencetext.indexOf(markertext) + markertext.length, 'score': 0});
			if((sentencetext.indexOf(markertext) + (markertext.length + 2)) >= RawTextParas[ParaKey].sentences['Sent-'+sentenceposition].end){
				sentenceposition ++;
			}
			if((sentencetext.indexOf(markertext) + markertext.length) >= RawTextParas[ParaKey].end){
				sentenceposition = 0;
			}
		}
	});
}

function UpdateDictionary(SKey, PKey)
{
	var tagindex = 0;
	var ParaKey = 'Para-0';
	var PreviousWordPos = 0;
	var subsentencetext = '';
	for(var sentind = 0; sentind < Object.keys(RawTextParas[ParaKey].sentences).length; sentind++){
		if(SKey && PKey){
			if(SKey != ('Sent-'+sentind) && PKey != ParaKey)continue;
		}		
		if(tagindex < $('.tagged').length){
			var clonedmark = $($('.tagged')[tagindex]).clone();		
			$(clonedmark).find('span').remove();
			var markertext = String($(clonedmark).text()).replace(/\s+/g, ' ').trim();
			if($($('.tagged')[tagindex]).parent().data('parakey') != ParaKey){
				sentind = 0;
				PreviousWordPos = 0;
				ParaKey = $($('.tagged')[tagindex]).parent().data('parakey');
			}
			subsentencetext = RawTextParas[ParaKey].sentences['Sent-'+sentind].senttext.substring(PreviousWordPos);
			var sentencetext = RawTextParas[ParaKey].sentences['Sent-'+sentind].senttext;
			if(subsentencetext.includes(markertext)){
				if(subsentencetext.indexOf(markertext)+PreviousWordPos < PreviousWordPos){
					PreviousWordPos = 0;
					continue;
				}
				RawTextParas[ParaKey].sentences['Sent-'+sentind].sentinfo.push({'word': markertext, 'tag': $($('.tagged')[tagindex]).find('span:first').text(), 'start': PreviousWordPos+subsentencetext.indexOf(markertext), 'end': PreviousWordPos+subsentencetext.indexOf(markertext) + markertext.length-1, 'score': 0});
				$($('.tagged')[tagindex]).attr('data-sentkey', 'Sent-'+sentind);
				tagindex++;			
				sentind--;
				PreviousWordPos = PreviousWordPos+subsentencetext.indexOf(markertext) + markertext.length;						
			}
			else{
				// sentence will be broken here and new sentence with the next iteration.
				PreviousWordPos  = 0;
				if(SKey)break;
			}
		}		
	}
}

function GetSentenceOfWord(parakey,word, startpos)
{
	for(var spos = startpos; spos < RawTextParas[parakey].sentences.length; spos++){
		if(RawTextParas[parakey].sentences['Sent-'+spos].senttext.includes(word))
		{
			return ['Sent-'+spos, spos];
		}
	}
	return ['Sent-'+0, 0];
}


function TagExistingNames()
{
	UpdateEntitiesArray();
	$('mark').each(function(i, val){
		var MatchedIndex = ExtendedContains($(val).children().eq(0).text());
		if(MatchedIndex > -1){
			$(val).css('background-color', $(Entities[MatchedIndex]).css('background-color'))
				  .addClass('tagged');
		}		
	});
}

function PopulateTree()
{
	var liststructure = `<ul>`;
	for(var di = 0; di < Object.keys(RawTextParas).length; di++){
		liststructure += `<li class='isFolder'>${'Para-'+di}
		<ul>
		<li>Start: ${RawTextParas['Para-'+di].start}</li>
		<li>End: ${RawTextParas['Para-'+di].end}</li>
		<li>SentenceCount: ${Object.keys(RawTextParas['Para-'+di].sentences).length} </li>`;
		for(var si = 0; si < Object.keys(RawTextParas['Para-'+di].sentences).length; si++){			 
			liststructure += `<li class='isFolder'>Sent.${si}-Text: ${RawTextParas['Para-'+di].sentences['Sent-'+si].senttext}
			<ul>
			<li>Start: ${RawTextParas['Para-'+di].sentences['Sent-'+si].start}</li>
			<li>End: ${RawTextParas['Para-'+di].sentences['Sent-'+si].end}</li>
			<li>EntityCount: ${RawTextParas['Para-'+di].sentences['Sent-'+si].sentinfo.length}</li>`
			for(var wi = 0; wi < RawTextParas['Para-'+di].sentences['Sent-'+si].sentinfo.length; wi++){				
				liststructure += `<li class='isFolder'>${RawTextParas['Para-'+di].sentences['Sent-'+si].sentinfo[wi].word}
				<ul>
				<li>Entity: ${RawTextParas['Para-'+di].sentences['Sent-'+si].sentinfo[wi].tag}</li>
				<li>Start: ${RawTextParas['Para-'+di].sentences['Sent-'+si].sentinfo[wi].start}</li>
				<li>End: ${RawTextParas['Para-'+di].sentences['Sent-'+si].sentinfo[wi].end}</li>
				<li>Weight: ${RawTextParas['Para-'+di].sentences['Sent-'+si].sentinfo[wi].score}</li>
				</ul>
				</li>`;
			}

			liststructure +='</ul></li>';
		}		
		liststructure+=`</ul></li>`;
	}
	liststructure += '</ul>';
	//$("#annotationtree").jstree(true).destroy();
	$.when($('#annotationtree').html(liststructure));

}

function DownloadInformationDictionary(content, fileName, contentType) {
	const a = document.createElement("a");
	const file = new Blob([content], { type: contentType });
	a.href = URL.createObjectURL(file);
	a.download = fileName;
	a.click();
}



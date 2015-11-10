/* chatURL - URL for updating chat messages */
var chatURL = "Controllers/chat.php";
var xmlHttpGetMessages = createXmlHttpRequestObject();
/* variables that establish how often to access the server */
var updateInterval = 1000; // how many miliseconds to wait to get new message
// when set to true, display detailed error messages
var debugMode = true;
/* initialize the messages cache */
var cache = new Array();
/* lastMessageID - the ID of the most recent chat message */
var lastMessageID = -1;
/* mouseX, mouseY - the event's mouse coordinates */
var mouseX, mouseY;
/* creates an XMLHttpRequest instance */
function createXmlHttpRequestObject()
{
// will store the reference to the XMLHttpRequest object
    var xmlHttp;
// this should work for all browsers except IE6 and older
    try
    {
// try to create XMLHttpRequest object
        xmlHttp = new XMLHttpRequest();
    }
    catch (e)
    {
// assume IE6 or older
        var XmlHttpVersions = new Array("MSXML2.XMLHTTP.6.0",
            "MSXML2.XMLHTTP.5.0",
            "MSXML2.XMLHTTP.4.0",
            "MSXML2.XMLHTTP.3.0",
            "MSXML2.XMLHTTP",
            "Microsoft.XMLHTTP");
// try every prog id until one works
        for (var i = 0; i < XmlHttpVersions.length && !xmlHttp; i++)
        {
            try
            {
// try to create XMLHttpRequest object
                xmlHttp = new ActiveXObject(XmlHttpVersions[i]);
            }
            catch (e) {
            }
        }
    }
// return the created object or display an error message
    if (!xmlHttp)
        alert("Error creating the XMLHttpRequest object.");
    else
        return xmlHttp;
}
/* this function initiates the chat; it executes when the chat page loads */
function init()
{
// get a reference to the text box where the user writes new messages
    var oMessageBox = document.getElementById("messageBox");
// prevents the autofill function from starting
    oMessageBox.setAttribute("autocomplete", "off");
// references the "Text will look like this" message
    checkUsername();
// initiates updating the chat window
    requestNewMessages();
}
// function that ensures that the username is never empty and if so
// a random name is generated
function checkUsername()
{
// ensures our user has a default random name when the form loads
    var oUser = document.getElementById("userName");
    if (oUser.value == "")
        oUser.value = "Guest" + Math.floor(Math.random() * 1000);
}
/* function called when the Send button is pressed */
function sendMessage()
{
// save the message to a local variable and clear the text box
    var oCurrentMessage = document.getElementById("messageBox");
    var currentUser = document.getElementById("userName").value;
// don't send void messages
    if (trim(oCurrentMessage.value) != "" && trim(currentUser) != "")
    {
// if we need to send and retrieve messages
        params = "mode=SendAndRetrieveNew" +
        "&id=" + encodeURIComponent(lastMessageID) +
        "&name=" + encodeURIComponent(currentUser) +
        "&message=" + encodeURIComponent(oCurrentMessage.value);
// add the message to the queue
        cache.push(params);
// clear the text box
        oCurrentMessage.value = "";
    }
}
/* function called when the Delete Messages button is pressed */
function deleteMessages()
{
// set the flag that specifies we're deleting the messages
    params = "mode=DeleteAndRetrieveNew";
// add the message to the queue
    cache.push(params);
}
/* makes asynchronous request to retrieve new messages, post new messages, delete messages */
function requestNewMessages()
{
// retrieve the username and color from the page
    var currentUser = document.getElementById("userName").value;
// only continue if xmlHttpGetMessages isn't void
    if (xmlHttpGetMessages)
    {
        try
        {
// don't start another server operation if such an operation
// is already in progress
            if (xmlHttpGetMessages.readyState == 4 ||
                xmlHttpGetMessages.readyState == 0)
            {
// we will store the parameters used to make the server request
                var params = "";
// if there are requests stored in queue, take the oldest one
                if (cache.length > 0)
                    params = cache.shift();
// if the cache is empty, just retrieve new messages
                else
                    params = "mode=RetrieveNew" +
                    "&id=" + lastMessageID;
// call the server page to execute the server-side operation
                xmlHttpGetMessages.open("POST", chatURL, true);
                xmlHttpGetMessages.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                xmlHttpGetMessages.onreadystatechange = handleReceivingMessages;
                xmlHttpGetMessages.send(params);
            }
            else
            {
// we will check again for new messages
                setTimeout("requestNewMessages();", updateInterval);
            }
        }
        catch (e)
        {
            displayError(e.toString());
        }
    }
}
/* function that handles the http response when updating messages */
function handleReceivingMessages()
{
// continue if the process is completed
    if (xmlHttpGetMessages.readyState == 4)
    {
// continue only if HTTP status is "OK"
        if (xmlHttpGetMessages.status == 200)
        {
            try
            {
// process the server's response
                readMessages();
            }
            catch (e)
            {
// display the error message
                displayError(e.toString());
            }
        }
        else
        {
// display the error message
            displayError(xmlHttpGetMessages.statusText);
        }
    }
}
/* function that processes the server's response when updating messages */
function readMessages()
{
// retrieve the server's response
    var response = xmlHttpGetMessages.responseText;
// server error?
    if (response.indexOf("ERRNO") >= 0
        || response.indexOf("error:") >= 0
        || response.length == 0)
        throw(response.length == 0 ? "Void server response." : response);
// retrieve the document element
    response = xmlHttpGetMessages.responseXML.documentElement;
// retrieve the flag that says if the chat window has been cleared or not
    clearChat = response.getElementsByTagName("clear").item(0).firstChild.data;
// if the flag is set to true, we need to clear the chat window
    if (clearChat == "true")
    {
// clear chat window and reset the id
        document.getElementById("scroll").innerHTML = "";
        lastMessageID = -1;
    }
// retrieve the arrays from the server's response
    idArray = response.getElementsByTagName("id");
    nameArray = response.getElementsByTagName("name");
    timeArray = response.getElementsByTagName("time");
    messageArray = response.getElementsByTagName("message");
// add the new messages to the chat window
    displayMessages(idArray,nameArray, timeArray, messageArray);
// the ID of the last received message is stored locally
    if (idArray.length > 0)
        lastMessageID = idArray.item(idArray.length - 1).firstChild.data;
// restart sequence
    setTimeout("requestNewMessages();", updateInterval);
}
/* function that appends the new messages to the chat list */
function displayMessages(idArray,nameArray,
                         timeArray, messageArray)
{
// each loop adds a new message
    for (var i = 0; i < idArray.length; i++)
    {
// get the message details        
        var time = timeArray.item(i).firstChild.data.toString();
        var name = nameArray.item(i).firstChild.data.toString();
        var message = messageArray.item(i).firstChild.data.toString();
// compose the HTML code that displays the message
        var htmlMessage = "";
        htmlMessage += "<div class=\"item\">";
        htmlMessage += "[" + time + "] " + name + " : ";
        htmlMessage += message.toString();
        htmlMessage += "</div>";
// display the message
        displayMessage(htmlMessage);
    }
}
// displays a message
function displayMessage(message)
{
// get the scroll object
    var oScroll = document.getElementById("scroll");
// check if the scroll is down
    var scrollDown = (oScroll.scrollHeight - oScroll.scrollTop <=
    oScroll.offsetHeight);
// display the message
    oScroll.innerHTML += message;
// scroll down the scrollbar
    oScroll.scrollTop = scrollDown ? oScroll.scrollHeight : oScroll.scrollTop;
}
// function that displays an error message
function displayError(message)
{
// display error message, with more technical details if debugMode is true
    displayMessage("Error accessing the server! " +
    (debugMode ? "<br/>" + message : ""));
}
function handleKey(e)
{
// get the event
    e = (!e) ? window.event : e;
// get the code of the character that has been pressed
    code = (e.charCode) ? e.charCode :
        ((e.keyCode) ? e.keyCode :
            ((e.which) ? e.which : 0));
// handle the keydown event
    if (e.type == "keydown")
    {
// if enter (code 13) is pressed
        if (code == 13)
        {
// send the current message
            sendMessage();
        }
    }
}
function trim(s)
{
    return s.replace(/(^\s+)|(\s+$)/g, "")
} 
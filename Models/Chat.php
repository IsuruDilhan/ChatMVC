<?php

class Chat {

// database handler
    private $mMysqli;

    function __construct() {
        $this->mMysqli = new mysqli("localhost", "root", "", "samplechat");
    }

// destructor closes database connection
    public function __destruct() {
        $this->mMysqli->close();
    }

// truncates the table containing the messages
    public function deleteMessages() {
// build the SQL query that adds a new message to the server
        $query = 'TRUNCATE TABLE chat';
// execute the SQL query
        $result = $this->mMysqli->query($query);
    }

    public function refreshChat() {
// build the SQL query that adds a new message to the server
        $query = "DELETE FROM chat WHERE posted_on < SUBTIME(NOW(),'0:5:0')";
// execute the SQL query
        $result = $this->mMysqli->query($query);
    }

    /*
      The postMessages method inserts a message into the database
      - $name represents the name of the user that posted the message
      - $messsage is the posted message
     */

    public function postMessage($name, $message) {
// escape the variable data for safely adding them to the database
        $name = $this->mMysqli->real_escape_string($name);
        $message = $this->mMysqli->real_escape_string($message);
// build the SQL query that adds a new message to the server
        $query = 'INSERT INTO chat(posted_on, user_name, message) ' .
            'VALUES (NOW(), "' . $name . '" , "' . $message . '")';
// execute the SQL query
        $result = $this->mMysqli->query($query);
    }

    /*
      The retrieveNewMessages method retrieves the new messages that have
      been posted to the server.
      - the $id parameter is sent by the client and it
      represents the id of the last message received by the client. Messages
      more recent by $id will be fetched from the database and returned to
      the client in XML format.
     */

    public function retrieveNewMessages($id = 0) {
// escape the variable data
        $id = $this->mMysqli->real_escape_string($id);
// compose the SQL query that retrieves new messages
        if ($id > 0) {
// retrieve messages newer than $id
            $query = 'SELECT chat_id, user_name, message,' .
                ' DATE_FORMAT(posted_on, "%Y-%m-%d %H:%i:%s") ' .
                ' AS posted_on ' .
                ' FROM chat WHERE chat_id > ' . $id .
                ' ORDER BY chat_id ASC';
        } else {
// on the first load only retrieve the last 50 messages from server
            $query = 'SELECT chat_id, user_name, message,posted_on FROM  (SELECT chat_id, user_name, message,DATE_FORMAT(posted_on,"%Y-%m-%d %H:%i:%s") AS posted_on  FROM chat ORDER BY chat_id DESC LIMIT 50) AS Last50 ORDER BY chat_id ASC';
        }
// execute the query
        $result = $this->mMysqli->query($query) or die($query . " " . mysqli_error($this->mMysqli));
// build the XML response
        $response = '<?xml version="1.0" encoding="UTF-8" ?>';
        $response .= '<response>';
// output the clear flag
        $response .= $this->isDatabaseCleared($id);
// check to see if we have any results
        if ($result->num_rows) {
// loop through all the fetched messages to build the result message
            while ($row = $result->fetch_array(MYSQLI_ASSOC)) {
                $id = $row['chat_id'];
                $userName = $row['user_name'];
                $time = $row['posted_on'];
                $message = $row['message'];
                $response .= '<id>' . $id . '</id>' . '<time>' . $time . '</time>' . '<name>' . $userName . '</name>' . '<message>' . $message . '</message>';
            }
// close the database connection as soon as possible
            $result->close();
        }
// finish the XML response and return it
        $response = $response . '</response>';
        return $response;
    }

    /*
      The isDatabaseCleared method checks to see if the database has been
      cleared since last call to the server
      - the $id parameter contains the id of the last message received by the client
     */

    private function isDatabaseCleared($id) {
        if ($id > 0) {
// by checking the number of rows with ids smaller than the client's
// last id we check to see if a truncate operation was performed in // the meantime
            $check_clear = 'SELECT count(*) old FROM chat where chat_id<=' . $id;
            $result = $this->mMysqli->query($check_clear);
            $row = $result->fetch_array(MYSQLI_ASSOC);
// if a truncate operation occured the whiteboard needs to be reset
            if ($row['old'] == 0)
                return '<clear>true</clear>';
        }
        return '<clear>false</clear>';
    }

}

?> 
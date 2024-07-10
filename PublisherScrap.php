<?php 

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Content-Type: application/json');

define("PREFIX", "aa_");

define("SITEURL", "https://searlco.xyz/");


$servername = "localhost";
$username = "usr_eml_filter";
$password = "flm73*7O";
$dbname = "db_eml_filter";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['action'])) {

    $action = $data['action'];
    switch ($action) {
        case 'publisherData':
            Publisher($data);
            break;
        case 'PublisherId':
            getPublisherId($data);
            break;
        case 'publisherAdditionalInfo':
            publisherAdditionalInfo($data);
            break;
        case 'tags':
            PublisherTags($data);
            break;
        default:
            $response = [
                'success' => false,
                'message' => 'Unknown action specified.',
            ];
            echo json_encode($response);
            break;
            }
  
        } else {
  
    $response = [
        'success' => false,
        'message' => 'Invalid request. Missing action parameter.',
    ];

    echo json_encode($response);
}

function Publisher($data)
{
    global $conn; 

    if (isset($data['data'])) {

        $publishersData = $data['data'];
        // Extract variables from the $publishersData array
       $publisherName = mysqli_real_escape_string($conn, $publishersData['publisherName']);
        $websiteLink = mysqli_real_escape_string($conn, $publishersData['website']);
        $title = mysqli_real_escape_string($conn, $publishersData['title']);
        $description = mysqli_real_escape_string($conn, $publishersData['description']);
        $category = mysqli_real_escape_string($conn, $publishersData['category']);

        $query = "INSERT INTO ".PREFIX."publishers (publisher_name, website, title, description, category, pub_type) VALUES ('$publisherName', '$websiteLink', '$title', '$description', '$category', '2')
         ON DUPLICATE KEY UPDATE
        website = VALUES(website),
        title = VALUES(title),
        description = VALUES(description),
        category = VALUES(category)";

        $result = $conn->query($query);

        if ($result === TRUE) {
            $response = [
                'success' => true,
                'message' => 'Publisher received successfully!',
                'data' =>  $publishersData,
            ];
            echo json_encode($response);
        } else {
            echo "Error: " . $conn->error;
        }
    } else {
        $response = [
            'success' => false,
            'message' => 'Invalid data format or missing required fields for scraped data.',
        ];
        echo json_encode($response);
    }
}

function getPublisherId($data)
{
    global $conn;

    if (isset($data['publisherName'])) {
        $publisherName = $data['publisherName'];
        $query = "SELECT id FROM ".PREFIX."publishers WHERE publisher_name = '$publisherName'";
        $result = $conn->query($query);

        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $response = [
                'success' => true,
                'message' => 'Publisher found in the database.',
                'publisher_id' => $row['id'],
            ];
             echo json_encode($response);
        } else {
            $response = [
                'success' => false,
                'message' => 'Publisher not found in the database.',
            ];
            echo json_encode($response);
        }
    } else {
        $response = [
            'success' => false,
            'message' => 'Invalid data format or missing required fields.',
        ];
        echo json_encode($response);
        return null;
    }
}

function publisherAdditionalInfo($data)
{
    global $conn;

    if (isset($data['data'], $data['publisher_id'])) {
        $additionalInfo = $data['data'];
        $publisherId = $data['publisher_id'];

        foreach ($additionalInfo as $info) {
            $label = mysqli_real_escape_string($conn, $info['label']);
            $value = mysqli_real_escape_string($conn, $info['value']);

            // Check if the combination of label, value, and publisher_id already exists
            $checkExistenceQuery = "SELECT id FROM ".PREFIX."publisher_additional_info WHERE label = '$label' AND value = '$value' AND publisher_id = $publisherId";

            $resultExistence = $conn->query($checkExistenceQuery);

            if ($resultExistence->num_rows === 0) {
                // If the combination does not exist, insert the data
                $query = "INSERT INTO ".PREFIX."publisher_additional_info (label, value, publisher_id) VALUES ('$label', '$value', $publisherId)";
                $result = $conn->query($query);

                if (!$result) {
                    $response = [
                        'success' => false,
                        'message' => 'Error inserting additional info into the database.',
                    ];
                    echo json_encode($response);
                    return;
                }
            } else {
                // Return a message indicating that the combination already exists
                $response = [
                    'success' => false,
                    'message' => 'Combination already exists',
                ];
                echo json_encode($response);
                return;
            }
        }

        $response = [
            'success' => true,
            'message' => 'Publisher Additional Info data received and stored successfully!',
            'data' => $additionalInfo,
        ];
        echo json_encode($response);
    } else {
        $response = [
            'success' => false,
            'message' => 'Invalid data format or missing required fields for AdditionalInfo data.',
            'datatag' => $data,
        ];
        echo json_encode($response);
    }
}


function PublisherTags($data)
{
    global $conn;

    if (isset($data['data'], $data['publisher_id'])) {

        $tags = $data['data'];

        $publisherId = $data['publisher_id'];

        foreach ($tags as $tag) {
            // Escape the tag to prevent SQL injection
            $escapedTag = mysqli_real_escape_string($conn, $tag);

            $query = "INSERT IGNORE INTO ".PREFIX."publisher_tags (tag_name, publisher_id) VALUES ('$escapedTag', $publisherId)";
            
            $result = $conn->query($query);

            if (!$result) {
                $response = [
                    'success' => false,
                    'message' => 'Error inserting tag into the database.',
                ];
                echo json_encode($response);
                return;
            }
        }

        $response = [
            'success' => true,
            'message' => 'Tags data received and stored successfully!',
            'data' => $tags,
        ];
        echo json_encode($response);
    } else {
        $response = [
            'success' => false,
            'message' => 'Invalid data format or missing required fields for tags data.',
            'datatag' => $data
        ];
        echo json_encode($response);
    }
}



?>
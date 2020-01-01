# ubiquiti-chat-server
Server-side of a fullstack chat app, built for Ubiquiti.


## Technologies used

* `NodeJS`
* `Express` server
* `socket.io` for real-time bidirectional communication
* `Winston`, for logging
* `Morgan`, HTTP request logging middleware
* `joi` from the hapi framework, for data validation

## Running

Simply run
>`yarn`

to install dependencies, and run a development version of the server with 

>`yarn run dev`

### Docker

#### Build

>`docker build -t server:1.0.0 .`

#### Start
>`docker run -p 8000:8000 --name chat_server client:1.0.0`

#### Access
The server will be available on `http://localhost:8000/`.

---

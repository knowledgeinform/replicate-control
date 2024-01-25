#include <stdlib.h>
#include <memory>
#include <string.h>

using namespace std; 



#define RELAY_DIGITAL_PIN 4     // Output Pin number
#define UV_ANALOG_PIN A1     //Analog Input Pin number
#define R_SENSE 164.3     //resistance on 4-20 mA input
#define DEFAULT_PERIOD 4     //INTEGER Duty Cycle Period in Seconds
#define DEFAULT_DUTY_CYCLE 10    //Duty Cycle Value in Percent (0-100, 2 decimal places)
#define SLOPE 52.374    //calibration slope
#define INTERCEPT -36.555     //calibration intercept
#define MAX_MESSAGE_LENGTH 32

#define BAUD_RATE 115200


class OzoneControl {
    private: 
        //Control pins and UV data 
        int relayPin;
        int uvPin;
        float uvData;

        float R_sense;
        float slope;
        float intercept;

        //PWM variables
        float period;
        float dutyCycle;
        unsigned long long int startTime;
        unsigned int onTimeMS;
        unsigned int offTimeMS;
        bool pwmState;
        bool powerState;


        


    public:

        char receivedChars[MAX_MESSAGE_LENGTH];
        char tempChars[MAX_MESSAGE_LENGTH];
        char msgType[MAX_MESSAGE_LENGTH];
        float msgValue = 0; 
        bool newData = false; 

        OzoneControl(){
            this->relayPin = RELAY_DIGITAL_PIN;
            this->uvPin = UV_ANALOG_PIN;

            this->R_sense = R_SENSE;
            this->slope = SLOPE;
            this->intercept = INTERCEPT;

            this->period = DEFAULT_PERIOD;
            this->dutyCycle = DEFAULT_DUTY_CYCLE;
            this->pwmState = false; 
            this->powerState = false; 




            this->initializePins();
            this->computeTimers();
            this->set_startTime();
        }

        void initializePins(){
            pinMode(this->relayPin,OUTPUT);
            digitalWrite(this->relayPin,LOW);

            pinMode(this->uvPin,INPUT);
            analogReadResolution(12);
        }

        void computeTimers(){
            this->onTimeMS = this->dutyCycle*this->period*10; //convert to ms by multiplying percent*10
            this->offTimeMS = this->period*1000 - this->onTimeMS;
            // Serial.println(onTimeMS);
            // Serial.println(offTimeMS);
        }

        void togglePWM(){
            if (millis()-this->startTime > this->offTimeMS && !digitalRead(this->relayPin)){
                digitalWrite(this->relayPin,HIGH);
//                this->pwmState = !(this->pwmState);
                this->startTime = millis();
                // Serial.println("ON - Resetting startTime");
            }else if (millis()-this->startTime > this->onTimeMS && digitalRead(this->relayPin)){
                digitalWrite(this->relayPin,LOW);
//                this->pwmState = !(this->pwmState);
                this->startTime = millis();
                // Serial.println("OFF - Resetting startTime");
            }
        }

        void set_powerState(bool new_powerState){
            this->powerState = new_powerState;
            digitalWrite(this->uvPin,LOW);
        }

        bool get_powerState(){
            return this->powerState;
        }

        void set_startTime(){
            this->startTime = millis();
        }

        unsigned long long int get_startTime(){
            return this->startTime;
        }

        void set_period(float new_period){
            this->period = new_period;
            this->computeTimers();
        }

        float get_period(){
            return this->period;
        }

        void set_dutyCycle(float new_dutyCycle){
            this->dutyCycle = new_dutyCycle;
            this->computeTimers();
        }

        float get_dutyCycle(){
            return this->dutyCycle;
        }

        float get_uvData(){
           this->uvData = this->slope * ((float) analogRead(this->uvPin)*3.3/4095) + this->intercept;
            return this->uvData;
        }

        void receieveData(){
            static bool recvInProgress = false; 
            static byte ndx = 0; 
            char startMarker = '<';
            char endMarker = '>';
            char rc; 

            while (Serial.available() > 0 && this->newData == false){
                rc = Serial.read();

                 if (recvInProgress == true) {
                    if (rc != endMarker) {
                        this->receivedChars[ndx] = rc;
                        ndx ++;
                        if (ndx >= MAX_MESSAGE_LENGTH){
                            ndx = MAX_MESSAGE_LENGTH - 1;
                        }
                    }
                    else {
                        this->receivedChars[ndx] = '\0';
                        recvInProgress = false; 
                        ndx = 0; 
                        this->newData = true;
                        // Serial.println("Setting newData = true");
                    }
                 }
                 else if (rc == startMarker){
                    recvInProgress = true;
                 }
            }
        }

        void parseData(){
            char * strtokIdx;

            strtokIdx = strtok(this->tempChars, ":");
            strcpy(this->msgType,this->tempChars);

            strtokIdx = strtok(NULL, ",");
            this->msgValue = atof(strtokIdx);
            
            if (strcmp(this->msgType,"on")==0){
                set_powerState(true);
                Serial.println("<ack:on>");
            }
            else if (strcmp(this->msgType,"off")==0){
                set_powerState(false);
                Serial.println("<ack:off>");
            }
            else if (strcmp(this->msgType,"q")==0){
                get_uvData();
                Serial.print("<data:");
                Serial.print(uvData);
                Serial.println(">");
            }
            else if (strcmp(this->msgType,"p")==0){
                set_period(float(msgValue));
                Serial.print("<ack:");
                Serial.print(msgType);
                Serial.print(msgValue);
                Serial.println(">");
            }
            else if (strcmp(this->msgType,"d")==0){
                set_dutyCycle(float(msgValue));
                Serial.print("<ack:");
                Serial.print(msgType);
                Serial.print(msgValue);
                Serial.println(">");
            }
            else{
            }

            

        }


//         void parseSerialInput(char _msg[]){
// //            Serial.print("Serial Available(): ");
// //            Serial.println(Serial.available());
//             char digitTest = _msg[1];
//             String str_msg;
//             str_msg = _msg;
// //            Serial.println("Start parsing");
//             if (isDigit(digitTest)){
// //                Serial.println("Completed digit check");
//                 msgType = str_msg.substring(0,1);
//                 msgValue = str_msg.substring(1).toFloat();
// //                Serial.println("Substring manipulation");
//             }
//             else{
//                 msgType = str_msg;
//                 msgValue = 0;
//             }

//             if (msgType == "on"){
//                 set_powerState(true);
//                 Serial.println("ack: on");
//             }
//             else if (msgType == "off"){
//                 set_powerState(false);
//                 Serial.println("ack: off");
//             }
//             else if (msgType == "q"){
//                 get_uvData();
//                 Serial.print("Data: ");
//                 Serial.println(uvData);
//             }
//             else if (msgType == "p"){
//                 set_period(float(msgValue));
//                 Serial.print("ack: ");
//                 Serial.print(msgType);
//                 Serial.println(msgValue);
//             }
//             else if (msgType == "d"){
//                 set_dutyCycle(float(msgValue));
//                 Serial.print(msgType);
//                 Serial.println(msgValue);
//             }
//             else{
//             }
//         }

//         void serialInput(){
//             while (Serial.available() > 0) {
//                 static char message[MAX_MESSAGE_LENGTH];
//                 static unsigned int message_pos = 0;
//                 char inByte = Serial.read();

//                 Serial.println("Read in char");
//                 if ( inByte != '\n' && (message_pos < MAX_MESSAGE_LENGTH - 1) ) {
//                     message[message_pos] = inByte;
//                     message_pos++;
//                 }
            
//                 else {
//                     Serial.print("Message pos: ");
//                     Serial.println(message_pos);
//                     message[message_pos] = '\0';
//                     msg = String(message);
//                     Serial.println("About to enter parsing");
//                     // parseSerialInput(message);
//                     message_pos = 0;
//                 } 
//             }
//         }
};




std::shared_ptr<OzoneControl> oC(nullptr);

// OzoneControl *oC;

void setup(){
    Serial.begin(BAUD_RATE);
    oC = std::make_shared<OzoneControl>();
    // OzoneControl ocTemp;
    // oC = &ocTemp;


    //Clears the serial input buffer of random characters on startup
    while (Serial.available() > 0) {
      Serial.read();
    }

}

void loop(){
    
    oC->receieveData();
    if (oC->newData == true){
        strcpy(oC->tempChars, oC->receivedChars);
        // Serial.print("newData = ");
        // Serial.println(oC->newData);


        oC->parseData();
        oC->newData = false; 
    }
    // Serial.println(oC->get_powerState());
    if (oC->get_powerState()){
        // Serial.print("Got power state: ");
        // Serial.println(oC->get_powerState());
        oC->togglePWM();
    }
    delay(10);
    // Serial.println("LOOP()");

}

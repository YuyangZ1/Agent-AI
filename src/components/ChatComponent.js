import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button, Input } from "antd";
import { AudioOutlined } from "@ant-design/icons";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import Speech from "speak-tts";
import { getSessionId } from "../utils/session";

const { Search } = Input;

const DOMAIN = "http://localhost:5001";

const searchContainer = {
  display: "flex",
  justifyContent: "center",
};

const ChatComponent = (props) => {
  const { handleResp, isLoading, setIsLoading } = props;
  // Define a state variable to keep track of the search value
  const [searchValue, setSearchValue] = useState("");

  const [isChatModeOn, setIsChatModeOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speech, setSpeech] = useState();

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  useEffect(() => {
    const initialized_speech = new Speech();
    initialized_speech
      .init({
        volume: 1,
        lang: "en-US",
        rate: 1,
        pitch: 1,
        voice: "Google US English",
        splitSentences: false,
      })
      .then((data) => {
        // The "data" object contains the list of available voices and the voice synthesis params
        console.log("Speech is ready, voices are available", data);
        setSpeech(initialized_speech);
      })
      .catch((e) => {
        console.error("An error occured while initializing : ", e);
      });
  }, []);

  useEffect(() => {
    if (!listening && Boolean(transcript)) {
      (async () => await onSearch(transcript))();
      setIsRecording(false);
    }
  }, [listening, transcript]);

  const talk = (what2say) => {
    speech
      .speak({
        text: what2say,
        queue: false, // current speech will be interrupted,
        listeners: {
          onstart: () => {
            console.log("Start utterance");
          },
          onend: () => {
            console.log("End utterance");
          },
          onresume: () => {
            console.log("Resume utterance");
          },
          onboundary: (event) => {
            console.log(
              event.name +
                " boundary reached after " +
                event.elapsedTime +
                " milliseconds.",
            );
          },
        },
      })
      .then(() => {
        // if everyting went well, start listening again
        console.log("Success !");
        userStartConvo();
      })
      .catch((e) => {
        console.error("An error occurred :", e);
      });
  };

  const userStartConvo = () => {
    SpeechRecognition.startListening();
    setIsRecording(true);
    resetTranscript();
  };

  const chatModeClickHandler = () => {
    setIsChatModeOn(!isChatModeOn);
    setIsRecording(false);
    SpeechRecognition.stopListening();

    resetTranscript();
  };

  const recordingClickHandler = () => {
    if (isRecording) {
      setIsRecording(false);
      SpeechRecognition.stopListening();

      resetTranscript();
    } else {
      setIsRecording(true);
      SpeechRecognition.startListening();
    }
  };

  const onSearch = async (question) => {
    // Clear the search input
    setSearchValue("");
    setIsLoading(true);

    try {
      const response = await axios.get(`${DOMAIN}/chat`, {
        params: {
          question,
        },
        headers: {
          "X-Session-Id": getSessionId(),
        },
      });
      handleResp(question, response.data);
      if (isChatModeOn) {
        // Voice mode reads the hybrid-ranked final answer, not a raw candidate.
        talk(response.data?.finalAnswer || response.data?.ragAnswer);
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      handleResp(question, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    // Update searchValue state when the user types in the input box
    setSearchValue(e.target.value);
  };

  return (
    <div style={{ ...searchContainer, alignItems: "center", gap: "8px" }}>
      {!isChatModeOn && (
        <>
          <span
            style={{
              color: "#22d3ee",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "14px",
              fontWeight: 600,
              userSelect: "none",
              marginRight: "-4px",
            }}
          >
            ›
          </span>
          <Search
            placeholder="ask DocuRAG anything…"
            enterButton="ASK"
            size="large"
            onSearch={onSearch}
            loading={isLoading}
            value={searchValue}
            onChange={handleChange}
          />
        </>
      )}
      <Button
        type={isChatModeOn ? undefined : "default"}
        size="large"
        danger={isChatModeOn}
        onClick={chatModeClickHandler}
      >
        {isChatModeOn ? "● VOICE ON" : "VOICE"}
      </Button>
      {isChatModeOn && (
        <Button
          type="primary"
          icon={<AudioOutlined />}
          size="large"
          danger={isRecording}
          onClick={recordingClickHandler}
        >
          {isRecording ? "● REC" : "TAP TO TALK"}
        </Button>
      )}
    </div>
  );
};

export default ChatComponent;

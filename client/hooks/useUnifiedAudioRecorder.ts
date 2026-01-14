import { useState, useRef, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import {
  useAudioRecorder,
  AudioModule,
  setAudioModeAsync,
  RecordingPresets,
} from "expo-audio";

interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

interface UnifiedAudioRecorder {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ uri: string; blob?: Blob } | null>;
  permissionStatus: PermissionStatus | null;
  requestPermission: () => Promise<boolean>;
}

function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined;
}

class WebAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private mimeType: string = "audio/webm";

  static isSupported(): boolean {
    return typeof MediaRecorder !== "undefined" && 
           typeof navigator !== "undefined" && 
           navigator.mediaDevices !== undefined;
  }

  async start(): Promise<void> {
    if (!WebAudioRecorder.isSupported()) {
      throw new Error("Audio recording is not supported in this browser");
    }
    
    this.chunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const supportedMimeType = getSupportedMimeType();
    const options: MediaRecorderOptions = {};
    if (supportedMimeType) {
      options.mimeType = supportedMimeType;
      this.mimeType = supportedMimeType.split(";")[0];
    }
    
    this.mediaRecorder = new MediaRecorder(this.stream, options);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };
    this.mediaRecorder.start();
  }

  async stop(): Promise<{ blob: Blob; uri: string }> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve({ blob: new Blob(), uri: "" });
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType });
        const uri = URL.createObjectURL(blob);
        
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }
        
        resolve({ blob, uri });
      };

      this.mediaRecorder.stop();
    });
  }

  static async checkPermission(): Promise<PermissionStatus> {
    try {
      const result = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      return {
        granted: result.state === "granted",
        canAskAgain: result.state !== "denied",
      };
    } catch {
      return { granted: false, canAskAgain: true };
    }
  }

  static async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }
}

const VOICE_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  sampleRate: 16000,
  bitRate: 32000,
};

export function useUnifiedAudioRecorder(): UnifiedAudioRecorder {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  
  const webRecorderRef = useRef<WebAudioRecorder | null>(null);
  
  const nativeRecorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (Platform.OS === "web") {
      const status = await WebAudioRecorder.checkPermission();
      setPermissionStatus(status);
    } else {
      const status = await AudioModule.getRecordingPermissionsAsync();
      setPermissionStatus({
        granted: status.granted,
        canAskAgain: status.canAskAgain,
      });
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      const granted = await WebAudioRecorder.requestPermission();
      setPermissionStatus({ granted, canAskAgain: !granted });
      return granted;
    } else {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setPermissionStatus({
        granted: status.granted,
        canAskAgain: status.canAskAgain,
      });
      return status.granted;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!permissionStatus?.granted) {
      const granted = await requestPermission();
      if (!granted) {
        throw new Error("Microphone permission is required to record");
      }
    }
    
    if (Platform.OS === "web") {
      if (!WebAudioRecorder.isSupported()) {
        throw new Error("Audio recording is not supported in this browser");
      }
      webRecorderRef.current = new WebAudioRecorder();
      await webRecorderRef.current.start();
      setIsRecording(true);
    } else {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
      });
      await nativeRecorder.prepareToRecordAsync();
      nativeRecorder.record();
      setIsRecording(true);
    }
  }, [nativeRecorder, permissionStatus, requestPermission]);

  const stopRecording = useCallback(async (): Promise<{ uri: string; blob?: Blob } | null> => {
    setIsRecording(false);
    
    if (Platform.OS === "web") {
      if (webRecorderRef.current) {
        const result = await webRecorderRef.current.stop();
        webRecorderRef.current = null;
        return result;
      }
      return null;
    } else {
      await nativeRecorder.stop();
      const uri = nativeRecorder.uri;
      if (uri) {
        return { uri };
      }
      return null;
    }
  }, [nativeRecorder]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    permissionStatus,
    requestPermission,
  };
}

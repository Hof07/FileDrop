import { useEffect, useRef, useState } from 'react';
import {
   Alert,
   Button,
   FlatList,
   SafeAreaView,
   StyleSheet,
   Text,
   TextInput,
   TouchableOpacity,
   View,
} from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import Zeroconf from 'react-native-zeroconf';

const PORT = 12345;
const SERVICE_TYPE = 'touchdrop';
const DEVICE_NAME = `phone-${Math.floor(Math.random() * 10000)}`;

type Status = 'idle' | 'searching' | 'found';

export default function Album() {
   const [messages, setMessages] = useState<string[]>([]);
   const [text, setText] = useState('');
   const [status, setStatus] = useState<Status>('idle');
   const [peerIp, setPeerIp] = useState<string | null>(null);

   const zeroconfRef = useRef(new Zeroconf());
   const serverRef = useRef<any>(null);

   // Start receiving server + advertise ourselves, once, on mount
   useEffect(() => {
      const server = TcpSocket.createServer((socket) => {
         socket.on('data', (data) => {
            setMessages((prev) => [data.toString(), ...prev]);
         });
         socket.on('error', (err) => console.log('socket error', err));
      });

      server.listen({ port: PORT, host: '0.0.0.0' });
      server.on('error', (err) => console.log('server error', err));
      serverRef.current = server;

      const zeroconf = zeroconfRef.current;
      zeroconf.publishService(SERVICE_TYPE, 'tcp', 'local.', DEVICE_NAME, PORT);

      return () => {
         server.close();
         zeroconf.stop();
         zeroconf.unpublishService(DEVICE_NAME);
      };
   }, []);

   // Tap top of screen -> search for the other phone
   const touchNotch = () => {
      if (status === 'found') {
         // Already connected — tap again to reset/search fresh
         setStatus('idle');
         setPeerIp(null);
         return;
      }

      setStatus('searching');

      const zeroconf = zeroconfRef.current;

      // Remove old listeners before adding a new one
      zeroconf.removeAllListeners('resolved');

      // Listen for nearby TouchDrop devices
      zeroconf.on(
         'resolved',
         (service: {
            name: string;
            addresses?: string[];
         }) => {
            // Ignore our own device
            if (service.name === DEVICE_NAME) {
               return;
            }

            // Get the first IP address
            const ip = service.addresses?.[0];

            if (ip) {
               setPeerIp(ip);
               setStatus('found');

               // Stop searching after finding a device
               zeroconf.stop();
            }
         }
      );

      // Search for TouchDrop devices
      zeroconf.scan(
         SERVICE_TYPE,
         'tcp',
         'local.'
      );

      // Stop searching after 10 seconds
      setTimeout(() => {
         setStatus((current) => {
            if (current === 'searching') {
               zeroconf.stop();

               Alert.alert(
                  'No device found',
                  'Make sure the other phone is on the same Wi-Fi and has tapped its notch too.'
               );

               return 'idle';
            }

            return current;
         });
      }, 10000);
   };

   const sendText = () => {
      if (!peerIp) return;
      if (!text.trim()) {
         Alert.alert('Empty message', 'Type something to share');
         return;
      }

      const client = TcpSocket.createConnection({ port: PORT, host: peerIp }, () => {
         client.write(text);
         client.destroy();
         setText('');
      });
      client.on('error', (err) => {
         console.log('connection error', err);
         Alert.alert('Send failed', 'Could not reach the other phone.');
      });
   };

   return (
      <SafeAreaView style={styles.container}>
         {/* "Notch" tap zone */}
         <TouchableOpacity style={styles.notch} onPress={touchNotch}>
            <Text style={styles.notchText}>
               {status === 'idle' && 'Tap here to connect'}
               {status === 'searching' && 'Searching...'}
               {status === 'found' && `Connected to ${peerIp}`}
            </Text>
         </TouchableOpacity>

         <Text style={styles.title}>Album</Text>
         <FlatList
            data={messages}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
               <View style={styles.card}>
                  <Text style={styles.cardText}>{item}</Text>
               </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No messages yet</Text>}
            style={{ flex: 1 }}
         />

         {status === 'found' && (
            <View style={styles.sendBox}>
               <TextInput
                  style={styles.input}
                  placeholder="Type here..."
                  value={text}
                  onChangeText={setText}
               />
               <Button title="Share" onPress={sendText} />
            </View>
         )}
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, padding: 16, backgroundColor: '#fff' },
   notch: {
      height: 50,
      backgroundColor: '#222',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
   },
   notchText: { color: '#fff', fontWeight: '600' },
   title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
   card: { backgroundColor: '#f2f2f2', padding: 12, borderRadius: 8, marginBottom: 8 },
   cardText: { fontSize: 16 },
   empty: { color: '#999', marginTop: 40, textAlign: 'center' },
   sendBox: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
   input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 8 },
});
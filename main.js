let APP_ID = "c91e2ebd053f482dae6b8f8dfaddefe6"

let token = null;
let uid = String(Math.floor(Math.random() * 10000))

let client;
let channel;

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')

if(!roomId){
    window.location = 'lobby.html'
}

let localStream;
let remoteStream;
let peerConnection;

const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

let constraints = {
    video:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1080},
    },
    audio:true
}

// Initialize button styles
let initializeButtonStyles = () => {
    const cameraBtn = document.getElementById('camera-btn')
    const micBtn = document.getElementById('mic-btn')
    
    // Set initial styles with transitions
    if(cameraBtn) {
        cameraBtn.style.transition = 'all 0.3s ease-in-out'
        cameraBtn.style.backgroundColor = 'rgb(179, 102, 249, .9)'
        cameraBtn.style.transform = 'scale(1)'
        cameraBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'
    }
    
    if(micBtn) {
        micBtn.style.transition = 'all 0.3s ease-in-out'
        micBtn.style.backgroundColor = 'rgb(179, 102, 249, .9)'
        micBtn.style.transform = 'scale(1)'
        micBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'
    }
}

let init = async () => {
    try {
        client = await AgoraRTM.createInstance(APP_ID)
        await client.login({uid, token})

        channel = client.createChannel(roomId)
        await channel.join()

        channel.on('MemberJoined', handleUserJoined)
        channel.on('MemberLeft', handleUserLeft)

        client.on('MessageFromPeer', handleMessageFromPeer)

        localStream = await navigator.mediaDevices.getUserMedia(constraints)
        document.getElementById('user-1').srcObject = localStream
        
        // Initialize button styles after stream is ready
        initializeButtonStyles()
        
    } catch (error) {
        console.error('Error initializing:', error)
    }
}

let handleUserLeft = (MemberId) => {
    document.getElementById('user-2').style.display = 'none'
    document.getElementById('user-1').classList.remove('smallFrame')
}

let handleMessageFromPeer = async (message, MemberId) => {
    message = JSON.parse(message.text)

    if(message.type === 'offer'){
        createAnswer(MemberId, message.offer)
    }

    if(message.type === 'answer'){
        addAnswer(message.answer)
    }

    if(message.type === 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}

let handleUserJoined = async (MemberId) => {
    console.log('A new user joined the channel:', MemberId)
    createOffer(MemberId)
}

let createPeerConnection = async (MemberId) => {
    peerConnection = new RTCPeerConnection(servers)

    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject = remoteStream
    document.getElementById('user-2').style.display = 'block'

    document.getElementById('user-1').classList.add('smallFrame')

    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
        document.getElementById('user-1').srcObject = localStream
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate', 'candidate':event.candidate})}, MemberId)
        }
    }
}

let createOffer = async (MemberId) => {
    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'offer', 'offer':offer})}, MemberId)
}

let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})}, MemberId)
}

let addAnswer = async (answer) => {
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
}

let leaveChannel = async () => {
    await channel.leave()
    await client.logout()
}

let toggleCamera = async () => {
    const cameraBtn = document.getElementById('camera-btn')
    let videoTrack = localStream.getTracks().find(track => track.kind === 'video')

    if(videoTrack.enabled){
        // Turning camera OFF
        videoTrack.enabled = false
        
        // Smooth transition to OFF state
        cameraBtn.style.backgroundColor = 'rgb(255, 80, 80)'
        cameraBtn.style.transform = 'scale(0.95)'
        cameraBtn.style.boxShadow = '0 2px 4px rgba(255, 80, 80, 0.4)'
        
        // Add a subtle shake animation
        cameraBtn.style.animation = 'shake 0.5s ease-in-out'
        
        // Remove animation after it completes
        setTimeout(() => {
            cameraBtn.style.animation = ''
        }, 500)
        
    } else {
        // Turning camera ON
        videoTrack.enabled = true
        
        // Smooth transition to ON state
        cameraBtn.style.backgroundColor = 'rgb(179, 102, 249, .9)'
        cameraBtn.style.transform = 'scale(1.05)'
        cameraBtn.style.boxShadow = '0 6px 12px rgba(179, 102, 249, 0.4)'
        
        // Add a subtle bounce animation
        cameraBtn.style.animation = 'bounce 0.6s ease-in-out'
        
        // Remove animation and reset scale after it completes
        setTimeout(() => {
            cameraBtn.style.animation = ''
            cameraBtn.style.transform = 'scale(1)'
        }, 600)
    }
}

let toggleMic = async () => {
    const micBtn = document.getElementById('mic-btn')
    let audioTrack = localStream.getTracks().find(track => track.kind === 'audio')

    if(audioTrack.enabled){
        // Turning mic OFF
        audioTrack.enabled = false
        
        // Smooth transition to OFF state
        micBtn.style.backgroundColor = 'rgb(255, 80, 80)'
        micBtn.style.transform = 'scale(0.95)'
        micBtn.style.boxShadow = '0 2px 4px rgba(255, 80, 80, 0.4)'
        
        // Add a subtle shake animation
        micBtn.style.animation = 'shake 0.5s ease-in-out'
        
        // Remove animation after it completes
        setTimeout(() => {
            micBtn.style.animation = ''
        }, 500)
        
    } else {
        // Turning mic ON
        audioTrack.enabled = true
        
        // Smooth transition to ON state
        micBtn.style.backgroundColor = 'rgb(179, 102, 249, .9)'
        micBtn.style.transform = 'scale(1.05)'
        micBtn.style.boxShadow = '0 6px 12px rgba(179, 102, 249, 0.4)'
        
        // Add a subtle bounce animation
        micBtn.style.animation = 'bounce 0.6s ease-in-out'
        
        // Remove animation and reset scale after it completes
        setTimeout(() => {
            micBtn.style.animation = ''
            micBtn.style.transform = 'scale(1)'
        }, 600)
    }
}

// Add hover effects
let addHoverEffects = () => {
    const cameraBtn = document.getElementById('camera-btn')
    const micBtn = document.getElementById('mic-btn')
    
    [cameraBtn, micBtn].forEach(btn => {
        if(btn) {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.1)'
                btn.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)'
            })
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)'
                btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'
            })
        }
    })
}

window.addEventListener('beforeunload', leaveChannel)

// Wait for DOM to load before adding event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('camera-btn').addEventListener('click', toggleCamera)
    document.getElementById('mic-btn').addEventListener('click', toggleMic)
    addHoverEffects()
    init()
})

// If DOM is already loaded
if (document.readyState === 'loading') {
    // Do nothing, DOMContentLoaded will fire
} else {
    // DOM is already loaded
    document.getElementById('camera-btn').addEventListener('click', toggleCamera)
    document.getElementById('mic-btn').addEventListener('click', toggleMic)
    addHoverEffects()
    init()
}
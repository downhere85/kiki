<template>
  <EHtml lang="en">
    <EHead />
    <EPreview>{{ preheadertext }}</EPreview>
    <EBody :style="main">
      <EContainer :style="container">
        <ESection :style="box">
          <EText :style="heading"> Password Reset </EText>
          <EHr :style="hr" />
          <EText :style="paragraph"> {{ title }} </EText>
          <EText :style="paragraph"> {{ content }} </EText>
          <EButton px="10" py="10" :style="button" :href="buttonLink"> {{ buttonText }} </EButton>
          <EHr :style="hr" />
          <EText :style="footer"> This link will expire in 24 hours. </EText>
          <EText :style="footer"> Kiki, based on Wiki.js — an open source project. </EText>
        </ESection>
      </EContainer>
    </EBody>
  </EHtml>
</template>

<script setup>
const props = defineProps({
  preheadertext: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  content: {
    type: String,
    default: '',
  },
  buttonLink: {
    type: String,
    default: '',
  },
  buttonText: {
    type: String,
    default: 'Reset Password',
  }
})

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const box = {
  padding: '0 48px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
}

const heading = {
  color: '#1a1a2e',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'left',
}

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left',
}

const button = {
  backgroundColor: '#656ee8',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'block',
  width: '100%',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
}
</script>

import streamlit as st
import streamlit.components.v1 as components

# Hide Streamlit Chrome and set layout to wide
st.set_page_config(page_title="Project Kairos", layout="wide", initial_sidebar_state="collapsed")

st.markdown("""
    <style>
    #MainMenu {visibility: hidden;}
    header {visibility: hidden;}
    footer {visibility: hidden;}
    .block-container {
        padding: 0rem;
        margin: 0rem;
        max-width: 100%;
    }
    iframe {
        border: none;
        width: 100vw;
        height: 100vh;
    }
    </style>
    """, unsafe_allow_html=True)

# Placeholder URL. Will update after Vercel deployment.
VERCEL_URL = "https://kairos-placeholder-wait-for-vercel.vercel.app"

components.iframe(VERCEL_URL, height=1000, scrolling=True)

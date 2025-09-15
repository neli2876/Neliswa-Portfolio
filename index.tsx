/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Type } from "@google/genai";

// We can't use process.env.GEMINI_API_KEY here. The user will provide it.
// This is a placeholder for the user's actual API key.
const API_KEY = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

const biographyContentElement = document.getElementById('biography-content');
const projectsGridElement = document.getElementById('projects-grid');
const certificationsGridElement = document.getElementById('certifications-grid');
const skillsGridElement = document.getElementById('skills-grid');
const hamburgerBtn = document.getElementById('hamburger-btn');
const navLinks = document.getElementById('nav-links');


/**
 * Default portfolio data to be used as a fallback if the API call fails.
 */
const defaultPortfolioData = {
  biography: "As a skilled Software Developer with a background in ICT and Applications Development, I specialize in C#, HTML, SQL, and cloud computing. I am passionate about leveraging technology to solve complex problems and have recently expanded my expertise into the exciting field of Artificial Intelligence. I am always eager to learn and apply new skills to create innovative and efficient solutions.",
  skills: [
    { skillName: "C# & .NET", description: "Building robust and scalable server-side applications." },
    { skillName: "HTML, CSS & JavaScript", description: "Creating responsive and interactive user interfaces." },
    { skillName: "SQL Databases", description: "Designing and managing relational databases for optimal performance." },
    { skillName: "Cloud Computing", description: "Deploying and managing applications on cloud platforms like Azure and AWS." },
    { skillName: "AI & Machine Learning", description: "Exploring and implementing AI models to build intelligent features." },
    { skillName: "Agile Methodologies", description: "Collaborating in fast-paced environments to deliver quality software." }
  ],
  projects: [
    { projectName: "AI Study Buddy", description: "A RAG-powered chatbot providing answers from a specialized knowledge base. It uses vector embeddings to find relevant document chunks and Gemini to generate context-aware, accurate responses.", technologies: ["Python", "Gemini API", "LangChain", "VectorDB"], githubUrl: "https://github.com/Nompil/ai-study-buddy", liveUrl: "https://capeitinitiative-my.sharepoint.com/:u:/g/personal/neliswa_mbele_capaciti_org_za/EeP6VWFug-NJk9_H73HY3-YBhyXqZr_w9b0e1R2EJQte6Q?e=v845FL" },
    { projectName: "Sentiment Analysis Dashboard", description: "An interactive dashboard that analyzes sentiment in text data, enabling users to understand emotional tone in customer reviews, social media posts, or other text content.", technologies: ["Python", "Flask", "Chart.js", "NLTK"], githubUrl: "https://github.com/skelletor147/sentimental-analysis-dashboard", liveUrl: "https://capeitinitiative-my.sharepoint.com/:u:/g/personal/neliswa_mbele_capaciti_org_za/ETbKaRdx1c5Do104LYkKIGsBvbI_z9NVhMIkbQwtzaQedA?e=LdGXyO" },
    { projectName: "Intelligent Resume Builder", description: "An intelligent resume generation system that creates customized, ATS-friendly resumes based on user inputs.", technologies: ["React", "Node.js", "Gemini API", "PDFKit"], githubUrl: "https://github.com/Mphefemulo/Masikhule.git", liveUrl: "https://masikhule-solutions.github.io/ai-resume-builder/" }
  ]
};


/**
 * Safely parses a JSON string from a Gemini response,
 * handling potential markdown code fences.
 * @param {string} text The raw text from the Gemini response.
 * @returns {any} The parsed JSON object.
 */
function parseGeminiJson(text: string): any {
    const trimmedText = text.trim();
    // Look for a markdown code block
    const match = trimmedText.match(/^```json\s*([\s\S]*?)\s*```$/);
    // If a match is found, use the captured group, otherwise use the trimmed text
    const jsonString = match ? match[1] : trimmedText;
    return JSON.parse(jsonString);
}


/**
 * Populates the portfolio sections with the provided data.
 * @param {object} data The portfolio data object containing biography, skills, and projects.
 */
function populatePortfolioContent(data: any) {
    if (!biographyContentElement || !skillsGridElement || !projectsGridElement) return;

    // Populate Biography
    biographyContentElement.textContent = data.biography;

    // Populate Skills
    skillsGridElement.innerHTML = ''; // Clear placeholders
    for (const skill of data.skills) {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.innerHTML = `
            <h3>${skill.skillName}</h3>
            <p>${skill.description}</p>
        `;
        skillsGridElement.appendChild(card);
    }

    // Populate Projects
    projectsGridElement.innerHTML = ''; // Clear placeholders
    for (const project of data.projects) {
        const card = document.createElement('div');
        card.className = 'project-card';
        
        const technologiesHtml = project.technologies.map((tech: string) => `<li class="project-tech-item">${tech}</li>`).join('');
        const liveUrlButton = project.liveUrl ? `<a href="${project.liveUrl}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">Live Demo</a>` : '';

        card.innerHTML = `
            <div class="project-card-content">
                <h3>${project.projectName}</h3>
                <p>${project.description}</p>
                <ul class="project-tech-list">${technologiesHtml}</ul>
            </div>
            <div class="project-card-actions">
                <a href="${project.githubUrl}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">View on GitHub</a>
                ${liveUrlButton}
            </div>
        `;
        projectsGridElement.appendChild(card);
    }
}


/**
 * Generates and displays all dynamic portfolio content.
 * It first checks for cached content, then tries to fetch from the API,
 * and finally falls back to default content if the API fails.
 */
async function generatePortfolioContent() {
    if (!biographyContentElement || !skillsGridElement || !projectsGridElement) return;

    // 1. Check for cached content first
    const cachedContent = localStorage.getItem('portfolioContent');
    if (cachedContent) {
        try {
            const data = JSON.parse(cachedContent);
            populatePortfolioContent(data);
            console.log("Loaded portfolio content from cache.");
            return; // Exit successfully if content is loaded from cache
        } catch (e) {
            console.error("Failed to parse cached content, fetching new content.", e);
            localStorage.removeItem('portfolioContent'); // Clear corrupted cache
        }
    }
    
    // 2. If no valid cache, fetch from the API
    try {
        const prompt = `Generate all content for a software developer's portfolio in a single JSON object.
        1. 'biography': A compelling 'About Me' section for a developer named Neliswa Mbele. Highlight a background in 'ICT in Applications Development', skills in C#, HTML, SQL, cloud computing, and a recent expansion into AI. Keep it 100-150 words.
        2. 'skills': A list of 6 key technical skills for a full-stack developer. Each skill should have a 'skillName' and a brief 'description'.
        3. 'projects': A list of 3 realistic-sounding projects. 
           - The first project MUST be named 'AI Study Buddy', described as a RAG (Retrieval-Augmented Generation) chatbot with domain-specific knowledge. Its 'githubUrl' MUST be 'https://github.com/Nompil/ai-study-buddy' and its 'liveUrl' MUST be 'https://capeitinitiative-my.sharepoint.com/:u:/g/personal/neliswa_mbele_capaciti_org_za/EeP6VWFug-NJk9_H73HY3-YBhyXqZr_w9b0e1R2EJQte6Q?e=v845FL'.
           - The second project MUST be named 'Sentiment Analysis Dashboard', described as 'An interactive dashboard that analyzes sentiment in text data, enabling users to understand emotional tone in customer reviews, social media posts, or other text content.', its 'githubUrl' MUST be 'https://github.com/skelletor147/sentimental-analysis-dashboard', and its 'liveUrl' MUST be 'https://capeitinitiative-my.sharepoint.com/:u:/g/personal/neliswa_mbele_capaciti_org_za/ETbKaRdx1c5Do104LYkKIGsBvbI_z9NVhMIkbQwtzaQedA?e=LdGXyO'.
           - The third project MUST be named 'Intelligent Resume Builder', described as 'An intelligent resume generation system that creates customized, ATS-friendly resumes based on user inputs.', its 'githubUrl' MUST be 'https://github.com/Mphefemulo/Masikhule.git', and its 'liveUrl' MUST be 'https://masikhule-solutions.github.io/ai-resume-builder/'. 
           - Each project must have 'projectName', 'description', 'technologies' (an array of 3-4 relevant tech strings), 'githubUrl' (use a '#' placeholder unless specified), and 'liveUrl' (use a '#' placeholder unless specified, or an empty string if not applicable).`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        biography: { type: Type.STRING },
                        skills: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    skillName: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                },
                                required: ["skillName", "description"],
                            },
                        },
                        projects: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    projectName: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    technologies: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING }
                                    },
                                    githubUrl: { type: Type.STRING },
                                    liveUrl: { type: Type.STRING }
                                },
                                required: ["projectName", "description", "technologies", "githubUrl", "liveUrl"]
                            }
                        }
                    },
                    required: ["biography", "skills", "projects"]
                },
            },
        });

        const data = parseGeminiJson(response.text);

        // 3. Populate page with new data and save it to cache
        populatePortfolioContent(data);
        localStorage.setItem('portfolioContent', JSON.stringify(data));
        console.log("Fetched new portfolio content from API and cached it.");

    } catch (error) {
        // 4. If API fails, load fallback content
        console.error("Failed to generate portfolio content:", error);
        console.warn("Displaying fallback content due to API error.");
        populatePortfolioContent(defaultPortfolioData);
    }
}


/**
 * Sets up the certifications section with links to view certificates.
 */
function setupCertifications() {
    if (!certificationsGridElement) return;
    
    const certifications = [
        { id: 'ai-ms', name: 'AI MS', issuer: 'Microsoft', url: 'https://capeitinitiative-my.sharepoint.com/:b:/g/personal/neliswa_mbele_capaciti_org_za/EeyeBDrbhztPg8gNOxfhg-YBPSLQ8WH52OWH-zGXcHrSiA?e=cHcllc' },
        { id: 'google-cloud', name: 'Google Cloud', issuer: 'Google', url: 'https://capeitinitiative-my.sharepoint.com/:b:/g/personal/neliswa_mbele_capaciti_org_za/EQBTbzZ5JUdAv94xZA7YeSsBTNeht46ETpaZrXbAUeDalQ?e=Za7ObA' },
        { id: 'ai-for-everyone', name: 'AI for Everyone', issuer: 'DeepLearning.AI', url: 'https://capeitinitiative-my.sharepoint.com/:b:/g/personal/neliswa_mbele_capaciti_org_za/EWq0Gw0x7yBGiQoSo1GNZ6MB6DqtGtRPfyFGlyWFqt2mhw?e=9E1q6V' },
        { id: 'generative-ai', name: 'Generative AI', issuer: 'Google Cloud', url: 'https://capeitinitiative-my.sharepoint.com/:b:/g/personal/neliswa_mbele_capaciti_org_za/EV_vMwSm82dAmvFKHG_www0B1za1Yy6BaGZ76uFisxCbuQ?e=rqC3zA' },
        { id: 'ai-essential', name: 'AI Essential', issuer: 'LinkedIn Learning', url: 'https://capeitinitiative-my.sharepoint.com/:b:/g/personal/neliswa_mbele_capaciti_org_za/EQKFFfw2J_1Pid6VElhfdfUBPtvU18SIAhW51yFZb-iFvw?e=ZNS4I5' },
        { id: 'ai-foundations-chatgpt', name: 'AI Foundations: Prompt Engineering with ChatGPT', issuer: 'LinkedIn Learning', url: 'https://capeitinitiative-my.sharepoint.com/:b:/g/personal/neliswa_mbele_capaciti_org_za/EcnzF_qNcqNAqcbtH-sdCI0Be7Cf3O3O14zMWFjA9VeblQ?e=3aEOCW' },
    ];

    certificationsGridElement.innerHTML = ''; // Clear existing content

    for (const cert of certifications) {
        const card = document.createElement('div');
        card.className = 'certification-card';
        card.dataset.id = cert.id;

        card.innerHTML = `
            <div>
                <h3>${cert.name}</h3>
                <p>Issued by: ${cert.issuer}</p>
            </div>
            <div class="certification-actions">
                 <a href="${cert.url}" class="view-cert-link" target="_blank" rel="noopener noreferrer">View Certificate</a>
            </div>
        `;
        certificationsGridElement.appendChild(card);
    }
}


/**
 * Sets up the mobile navigation hamburger menu and smooth scrolling.
 */
function setupMobileMenu() {
    if (!hamburgerBtn || !navLinks) return;

    const closeMenu = () => {
        hamburgerBtn.classList.remove('is-active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('nav-active');
    };

    hamburgerBtn.addEventListener('click', () => {
        const isActive = hamburgerBtn.classList.toggle('is-active');
        hamburgerBtn.setAttribute('aria-expanded', String(isActive));
        navLinks.classList.toggle('nav-active');
    });

    // Handle smooth scrolling and close menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (event: MouseEvent) => {
            event.preventDefault(); // Prevent the default jump
            const targetId = link.getAttribute('href');
            
            if (targetId) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    // Use JS to scroll smoothly into view
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
            
            // Close mobile menu if it's open
            closeMenu();
        });
    });
}

// Handle form submission
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Thank you for your message! (This is a demo)');
        (e.target as HTMLFormElement).reset();
    });
}

// Generate content when the page loads
window.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  setupCertifications();
  generatePortfolioContent(); // Single call to fetch all dynamic content
});
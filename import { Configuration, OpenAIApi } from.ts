import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});

const openai = new OpenAIApi(configuration);

// Code analysis using OpenAI
export async function analyzeCode(code: string, language: string, userSkillLevel: string): Promise<any[]> {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: `You are a code analysis expert. Analyze code to create educational blanks.`
      }, {
        role: "user",
        content: `Analyze this ${language} code for a ${userSkillLevel} developer:
        
        ${code}
        
        Identify 3-5 concepts to blank out. Return JSON array with structure:
        {
          lineNumber: number,
          start: number,
          end: number,
          hint: {
            title: string,
            docs: string,
            logic: string,
            example: string
          }
        }`
      }],
      temperature: 0.2
    });

    return JSON.parse(response.data.choices[0].message?.content || '[]');
  } catch (error) {
    console.error("OpenAI API error:", error);
    return [];
  }
}

// Documentation retrieval using OpenAI
export async function retrieveDocumentation(feature: string, language: string): Promise<any> {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{
        role: "user",
        content: `Provide documentation for ${feature} in ${language}. Return JSON:
        {
          "syntax": "syntax pattern",
          "description": "concise description",
          "docs_link": "official documentation URL"
        }`
      }],
      temperature: 0.1
    });

    return JSON.parse(response.data.choices[0].message?.content || '{}');
  } catch (error) {
    console.error("OpenAI API error:", error);
    return null;
  }
}

// Code generation using OpenAI
export async function generateCode(prompt: string, language: string): Promise<string | null> {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: `You are a ${language} expert. Generate well-commented, production-ready code.`
      }, {
        role: "user",
        content: prompt
      }],
      temperature: 0.2
    });

    return response.data.choices[0].message?.content || null;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return null;
  }
}
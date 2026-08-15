import type { NWScriptASTNode, NWScriptProgramNode, NWScriptFunctionNode, NWScriptBlockNode, NWScriptIfNode, NWScriptIfElseNode, NWScriptWhileNode, NWScriptDoWhileNode, NWScriptForNode, NWScriptExpressionStatementNode, NWScriptAssignmentNode, NWScriptReturnNode, NWScriptVariableDeclarationNode, NWScriptGlobalVariableDeclarationNode, NWScriptSwitchNode, NWScriptSwitchCaseNode } from "@/nwscript/decompiler/NWScriptAST";
import { NWScriptASTNodeType } from "@/nwscript/decompiler/NWScriptAST";
import type { NWScriptExpression } from "@/nwscript/decompiler/NWScriptExpression";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";

/**
 * Generates NSS source code from an Abstract Syntax Tree.
 * This is the final step in the decompilation pipeline.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptASTCodeGenerator.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptASTCodeGenerator {
  private indentLevel: number = 0;
  private indentString: string = '    '; // 4 spaces

  /**
   * Generate NSS source code from an AST
   */
  generate(ast: NWScriptProgramNode): string {
    const lines: string[] = [];

    for (const struct of ast.structs) {
      lines.push(`struct ${struct.name} {`);
      for (const field of struct.fields) {
        lines.push(`${this.indentString}${this.getTypeName(field.type)} ${field.name};`);
      }
      lines.push('};', '');
    }

    // NCS stores routines by address and permits forward calls; NSS requires a
    // declaration before use. Emit prototypes for every recovered helper so source
    // order, recursion, mutually-recursive call graphs, and helper calls in global
    // initializers all remain compilable.
    const helpers = ast.functions.filter(func =>
      func.name !== 'main' && func.name !== 'StartingConditional'
    );
    for (const func of helpers) {
      lines.push(`${this.generateFunctionSignature(func)};`);
    }
    if (helpers.length > 0) {
      lines.push('');
    }

    // Generate global variable declarations after prototypes: NWScript permits a global
    // initializer to call a user routine, but requires that routine to be declared first.
    for (const global of ast.globals) {
      lines.push(this.generateGlobalVariableDeclaration(global));
    }

    if (ast.globals.length > 0) {
      lines.push(''); // Blank line after globals
    }

    // Generate function definitions
    for (const func of ast.functions) {
      lines.push(...this.generateFunction(func));
      lines.push(''); // Blank line after function
    }

    // Generate main body (if present)
    if (ast.mainBody) {
      lines.push(...this.generateBlock(ast.mainBody));
    }

    return lines.join('\n');
  }

  /**
   * Generate global variable declaration
   */
  private generateGlobalVariableDeclaration(decl: NWScriptGlobalVariableDeclarationNode): string {
    const typeName = this.getTypeName(decl.dataType, decl.structName);
    const name = decl.name;
    
    if (decl.initializer) {
      return `${typeName} ${name} = ${decl.initializer.toNSS()};`;
    } else {
      return `${typeName} ${name};`;
    }
  }

  /**
   * Generate function definition
   */
  private generateFunction(func: NWScriptFunctionNode): string[] {
    const lines: string[] = [];

    // Function signature
    lines.push(this.generateFunctionSignature(func));
    lines.push('{');

    // Local variable declarations
    this.indentLevel++;
    for (const local of func.locals) {
      lines.push(this.indent() + this.generateVariableDeclaration(local));
    }

    if (func.locals.length > 0) {
      lines.push(''); // Blank line after locals
    }

    // Function body
    const bodyLines = this.generateBlock(func.body);
    if (bodyLines.length > 0) {
      lines.push(...bodyLines.map(line => this.indent() + line));
    }

    this.indentLevel--;
    lines.push('}');

    return lines;
  }

  private generateFunctionSignature(func: NWScriptFunctionNode): string {
    const returnTypeName = this.getTypeName(func.returnType, func.returnStructName);
    const params = func.parameters
      .map(parameter =>
        `${this.getTypeName(parameter.type, parameter.structName)} ${parameter.name}`
      )
      .join(', ');
    return `${returnTypeName} ${func.name}(${params})`;
  }

  /**
   * Generate variable declaration
   */
  private generateVariableDeclaration(decl: NWScriptVariableDeclarationNode): string {
    const typeName = this.getTypeName(decl.dataType, decl.structName);
    const name = decl.name;
    
    if (decl.initializer) {
      return `${typeName} ${name} = ${decl.initializer.toNSS()};`;
    } else {
      return `${typeName} ${name};`;
    }
  }

  /**
   * Generate block
   */
  private generateBlock(block: NWScriptBlockNode): string[] {
    const lines: string[] = [];

    if (block.statements.length === 0) {
      // Empty block
      return lines;
    }

    for (const statement of block.statements) {
      const stmtLines = this.generateStatement(statement);
      lines.push(...stmtLines);
    }

    return lines;
  }

  /**
   * Generate statement
   */
  private generateStatement(node: NWScriptASTNode): string[] {
    const lines: string[] = [];

    switch (node.type) {
      case NWScriptASTNodeType.EXPRESSION_STATEMENT:
        lines.push(this.generateExpressionStatement(node as NWScriptExpressionStatementNode));
        break;

      case NWScriptASTNodeType.ASSIGNMENT:
        lines.push(this.generateAssignment(node as NWScriptAssignmentNode));
        break;

      case NWScriptASTNodeType.RETURN:
        lines.push(this.generateReturn(node as NWScriptReturnNode));
        break;

      case NWScriptASTNodeType.IF:
        lines.push(...this.generateIf(node as NWScriptIfNode));
        break;

      case NWScriptASTNodeType.IF_ELSE:
        lines.push(...this.generateIfElse(node as NWScriptIfElseNode));
        break;

      case NWScriptASTNodeType.WHILE:
        lines.push(...this.generateWhile(node as NWScriptWhileNode));
        break;

      case NWScriptASTNodeType.DO_WHILE:
        lines.push(...this.generateDoWhile(node as NWScriptDoWhileNode));
        break;

      case NWScriptASTNodeType.FOR:
        lines.push(...this.generateFor(node as NWScriptForNode));
        break;

      case NWScriptASTNodeType.BREAK:
        lines.push('break;');
        break;

      case NWScriptASTNodeType.CONTINUE:
        lines.push('continue;');
        break;

      case NWScriptASTNodeType.SWITCH:
        lines.push(...this.generateSwitch(node as NWScriptSwitchNode));
        break;

      case NWScriptASTNodeType.EMPTY:
        break;

      case NWScriptASTNodeType.BLOCK:
        lines.push(...this.generateBlock(node as NWScriptBlockNode));
        break;

      case NWScriptASTNodeType.SWITCH_CASE:
      case NWScriptASTNodeType.SWITCH_DEFAULT:
        lines.push(`// misplaced ${node.type} node`);
        break;

      default:
        lines.push('// Unknown statement type: ' + node.type);
        break;
    }

    return lines;
  }

  /**
   * Generate expression statement
   */
  private generateExpressionStatement(stmt: NWScriptExpressionStatementNode): string {
    return stmt.expression.toNSS() + ';';
  }

  /**
   * Generate assignment
   */
  private generateAssignment(assign: NWScriptAssignmentNode): string {
    // NSS globals are referenced by identifier; "GLOBAL." is not valid source syntax.
    return `${assign.variable} = ${assign.value.toNSS()};`;
  }

  /**
   * Generate return statement
   */
  private generateReturn(ret: NWScriptReturnNode): string {
    if (ret.value) {
      return `return ${ret.value.toNSS()};`;
    } else {
      return 'return;';
    }
  }

  /**
   * Generate if statement
   */
  private generateIf(ifNode: NWScriptIfNode): string[] {
    const lines: string[] = [];
    const condition = ifNode.condition.toNSS();
    
    lines.push(`if (${condition})`);
    lines.push('{');
    lines.push(...this.nestLines(this.generateBlock(ifNode.thenBody), true));
    lines.push('}');
    
    return lines;
  }

  /**
   * Generate if-else statement
   */
  private generateIfElse(ifElseNode: NWScriptIfElseNode): string[] {
    const lines: string[] = [];
    const condition = ifElseNode.condition.toNSS();
    
    lines.push(`if (${condition})`);
    lines.push('{');
    lines.push(...this.nestLines(this.generateBlock(ifElseNode.thenBody), true));
    lines.push('}');
    lines.push('else');
    lines.push('{');
    lines.push(...this.nestLines(this.generateBlock(ifElseNode.elseBody), true));
    lines.push('}');
    
    return lines;
  }

  /**
   * Generate while loop
   */
  private generateWhile(whileNode: NWScriptWhileNode): string[] {
    const lines: string[] = [];
    const condition = whileNode.condition.toNSS();
    
    lines.push(`while (${condition})`);
    lines.push('{');
    lines.push(...this.nestLines(this.generateBlock(whileNode.body), true));
    lines.push('}');
    
    return lines;
  }

  /**
   * Generate do-while loop
   */
  private generateDoWhile(doWhileNode: NWScriptDoWhileNode): string[] {
    const lines: string[] = [];
    const condition = doWhileNode.condition.toNSS();
    
    lines.push('do');
    lines.push('{');
    lines.push(...this.nestLines(this.generateBlock(doWhileNode.body), true));
    lines.push(`} while (${condition});`);
    
    return lines;
  }

  /**
   * Generate for loop
   */
  private generateFor(forNode: NWScriptForNode): string[] {
    const lines: string[] = [];
    
    let init = '';
    if (forNode.init) {
      const initLines = this.generateStatement(forNode.init);
      if (initLines.length > 0) {
        init = initLines[0].replace(/;$/, ''); // Remove trailing semicolon
      }
    }
    
    const condition = forNode.condition ? forNode.condition.toNSS() : '';
    
    let increment = '';
    if (forNode.increment) {
      const incLines = this.generateStatement(forNode.increment);
      if (incLines.length > 0) {
        increment = incLines[0].replace(/;$/, ''); // Remove trailing semicolon
      }
    }
    
    lines.push(`for (${init}; ${condition}; ${increment})`);
    lines.push('{');
    lines.push(...this.nestLines(this.generateBlock(forNode.body), true));
    lines.push('}');
    
    return lines;
  }

  private generateSwitch(switchNode: NWScriptSwitchNode): string[] {
    const lines: string[] = [];
    lines.push(`switch (${switchNode.expression.toNSS()})`);
    lines.push('{');

    for (const c of switchNode.cases) {
      lines.push(`${this.indentString}case ${c.value.toNSS()}:`);
      lines.push(...this.nestLines(this.nestLines(this.generateBlock(c.body))));
    }
    if (switchNode.defaultCase) {
      lines.push(`${this.indentString}default:`);
      lines.push(...this.nestLines(this.nestLines(this.generateBlock(switchNode.defaultCase.body))));
    }

    lines.push('}');
    return lines;
  }

  /**
   * Get type name as string
   */
  private getTypeName(dataType: NWScriptDataType, structName?: string): string {
    switch (dataType) {
      case NWScriptDataType.INTEGER:
        return 'int';
      case NWScriptDataType.FLOAT:
        return 'float';
      case NWScriptDataType.STRING:
        return 'string';
      case NWScriptDataType.OBJECT:
        return 'object';
      case NWScriptDataType.VOID:
        return 'void';
      case NWScriptDataType.VECTOR:
        return 'vector';
      case NWScriptDataType.EFFECT:
        return 'effect';
      case NWScriptDataType.EVENT:
        return 'event';
      case NWScriptDataType.LOCATION:
        return 'location';
      case NWScriptDataType.TALENT:
        return 'talent';
      case NWScriptDataType.STRUCTURE:
        return structName ? `struct ${structName}` : 'unknown';
      default:
        return 'unknown';
    }
  }

  /**
   * Prefix nested block lines by one indent. Nested control structures return
   * unindented lines, so a global indent counter would double-space them.
   */
  private nestLines(bodyLines: string[], emptyComment = false): string[] {
    if (bodyLines.length > 0) {
      return bodyLines.map(line => this.indentString + line);
    }
    return emptyComment ? [this.indentString + '// Empty'] : [];
  }

  /**
   * Get current indentation string
   */
  private indent(): string {
    return this.indentString.repeat(this.indentLevel);
  }
}

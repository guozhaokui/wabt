/*
 * Copyright 2016 WebAssembly Community Group participants
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include <cassert>
#include <cinttypes>
#include <cstdio>
#include <cstdlib>

#include "src/apply-names.h"
#include "src/binary-reader.h"
#include "src/binary-reader-ir.h"
#include "src/error-handler.h"
#include "src/feature.h"
#include "src/generate-names.h"
#include "src/ir.h"
#include "src/option-parser.h"
#include "src/stream.h"
#include "src/validator.h"
#include "src/wast-lexer.h"
#include "src/wat-writer.h"

using namespace wabt;

static int s_verbose;
static std::string s_infile;
static std::string s_outfile;
static Features s_features;
static WriteWatOptions s_write_wat_options;
static bool s_generate_names;
static bool s_read_debug_names = true;
static std::unique_ptr<FileStream> s_log_stream;
static bool s_validate = true;

static const char s_description[] =
R"(  Read a file in the WebAssembly binary format, and convert it to
  the WebAssembly text format.

examples:
  # parse binary file test.wasm and write text file test.wast
  $ wasm2wat test.wasm -o test.wat

  # parse test.wasm, write test.wat, but ignore the debug names, if any
  $ wasm2wat test.wasm --no-debug-names -o test.wat
)";

static void ParseOptions(int argc, char** argv) {
  OptionParser parser("wasm2wat", s_description);

  parser.AddOption('v', "verbose", "Use multiple times for more info", []() {
    s_verbose++;
    s_log_stream = FileStream::CreateStdout();
  });
  parser.AddHelpOption();
  parser.AddOption(
      'o', "output", "FILENAME",
      "Output file for the generated wast file, by default use stdout",
      [](const char* argument) {
        s_outfile = argument;
        ConvertBackslashToSlash(&s_outfile);
      });
  parser.AddOption('f', "fold-exprs", "Write folded expressions where possible",
                   []() { s_write_wat_options.fold_exprs = true; });
  s_features.AddOptions(&parser);
  parser.AddOption("inline-exports", "Write all exports inline",
                   []() { s_write_wat_options.inline_export = true; });
  parser.AddOption("no-debug-names", "Ignore debug names in the binary file",
                   []() { s_read_debug_names = false; });
  parser.AddOption(
      "generate-names",
      "Give auto-generated names to non-named functions, types, etc.",
      []() { s_generate_names = true; });
  parser.AddOption("no-check", "Don't check for invalid modules",
                   []() { s_validate = false; });
  parser.AddArgument("filename", OptionParser::ArgumentCount::One,
                     [](const char* argument) {
                       s_infile = argument;
                       ConvertBackslashToSlash(&s_infile);
                     });
  parser.Parse(argc, argv);
}

void visitFuncGraph(Module& module, Func* func,int& totalsz) {
    if (func->visiting)
        return;
    func->visiting = true;
    totalsz += func->size;
    for (int i = 0; i < func->callfuncs.size(); i++) {
        auto& c = module.funcs[func->callfuncs[i]];
        visitFuncGraph(module, c, totalsz);
    }
}

int getFunctionTotalSize(Module& module, Func* func) {
    //����
    for (auto& f : module.funcs) {
        f->visiting = false;
    }

    int total = 0;
    visitFuncGraph(module, func, total);
    func->totalsize = total;
    return func->totalsize;
}

void printFuncs(Module& module) {
    int sum = 0;
    int sz = module.funcs.size();
    for (auto& func : module.funcs) {
        printf(R"("%s":{"self":%d,"total":%d )",func->name.c_str(), (int)func->size , getFunctionTotalSize(module, func));
        if (func->callfuncs.size() > 0) {
            printf(R"(,"childs":[)");
            for (int i = 0; i < func->callfuncs.size(); i++) {
                if (i > 0)printf(",");
                printf(" \"%s\"", module.funcs[func->callfuncs[i]]->name.c_str());
            }
            printf("]");
        }
        printf("},\n");
        sum += func->size;
    }
    printf("function size end total=%d\n",sum);
}

int ProgramMain(int argc, char** argv) {
  Result result;

  InitStdio();
  ParseOptions(argc, argv);

  std::vector<uint8_t> file_data;
  result = ReadFile(s_infile.c_str(), &file_data);
  if (Succeeded(result)) {
    ErrorHandlerFile error_handler(Location::Type::Binary);
    Module module;
    const bool kStopOnFirstError = true;
    ReadBinaryOptions options(s_features, s_log_stream.get(),
                              s_read_debug_names, kStopOnFirstError);
    result = ReadBinaryIr(s_infile.c_str(), DataOrNull(file_data),
                          file_data.size(), &options, &error_handler, &module);
    if (Succeeded(result)) {
        printFuncs(module);
      if (Succeeded(result) && s_validate) {
        WastLexer* lexer = nullptr;
        result = ValidateModule(lexer, &module, &error_handler);
      }

      if (s_generate_names)
        result = GenerateNames(&module);

      if (Succeeded(result)) {
        /* TODO(binji): This shouldn't fail; if a name can't be applied
         * (because the index is invalid, say) it should just be skipped. */
        Result dummy_result = ApplyNames(&module);
        WABT_USE(dummy_result);
      }

      if (Succeeded(result)) {
        FileStream stream(!s_outfile.empty() ? FileStream(s_outfile.c_str())
                                             : FileStream(stdout));
        result = WriteWat(&stream, &module, &s_write_wat_options);
      }
    }
  }
  return result != Result::Ok;
}

int main(int argc, char** argv) {
  WABT_TRY
  return ProgramMain(argc, argv);
  WABT_CATCH_BAD_ALLOC_AND_EXIT
}
